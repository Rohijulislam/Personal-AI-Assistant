"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { DataCollection } from "@/lib/data-transfer";
import {
  isCollectionMigrated,
  markCollectionMigrated,
  readCloudCollection,
  writeCloudCollection,
} from "@/lib/supabase/collection-store";

type PendingWrite = {
  userId: string;
  collection: DataCollection;
  baseline: unknown;
  payload: unknown;
  timer?: ReturnType<typeof setTimeout>;
  running?: Promise<void>;
};

const pendingWrites = new Map<string, PendingWrite>();
const snapshots = new Map<string, unknown>();
const sharedValues = new Map<string, unknown>();
const subscribers = new Map<string, Set<(value: unknown) => void>>();
const keyFor = (userId: string, collection: DataCollection) => `${userId}:${collection}`;

function publish(key: string, value: unknown) {
  sharedValues.set(key, value);
  subscribers.get(key)?.forEach((listener) => listener(value));
}

async function flushWrite(key: string): Promise<void> {
  const entry = pendingWrites.get(key);
  if (!entry) return;
  if (entry.timer) clearTimeout(entry.timer);
  entry.timer = undefined;
  if (entry.running) return entry.running;
  entry.running = (async () => {
    while (entry.payload !== undefined) {
      const next = entry.payload;
      entry.payload = undefined;
      try {
        await writeCloudCollection(createClient(), entry.userId, entry.collection, entry.baseline, next);
        entry.baseline = next;
        snapshots.set(key, next);
      } catch (error) {
        if (entry.payload === undefined) entry.payload = next;
        throw error;
      }
    }
  })();
  try {
    await entry.running;
  } finally {
    entry.running = undefined;
    if (entry.payload === undefined) pendingWrites.delete(key);
    else if (!entry.timer) {
      entry.timer = setTimeout(() => {
        void flushWrite(key).catch((error) => console.error(`Could not save ${entry.collection} to Supabase`, error));
      }, 1500);
    }
  }
}

export async function flushPendingUserDataWrites(): Promise<void> {
  await Promise.all([...pendingWrites.keys()].map(flushWrite));
}

function queueWrite(userId: string, collection: DataCollection, payload: unknown) {
  const key = keyFor(userId, collection);
  const entry = pendingWrites.get(key) ?? {
    userId, collection, baseline: snapshots.get(key), payload,
  };
  entry.payload = payload;
  if (entry.timer) clearTimeout(entry.timer);
  entry.timer = setTimeout(() => {
    void flushWrite(key).catch((error) => console.error(`Could not save ${collection} to Supabase`, error));
  }, collection === "drafts" ? 700 : 350);
  pendingWrites.set(key, entry);
}

function cachedValue<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function cacheValue(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { /* Browser storage is an optional cache. */ }
}

function readCacheFlag(key: string): boolean {
  try { return localStorage.getItem(key) === "1"; }
  catch { return false; }
}

/** Loads a user's record-level collection and imports legacy data exactly once. */
export function useUserData<T>(
  collection: DataCollection,
  storageKey: string,
  initialValue: T,
) {
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);
  const [cacheKey, setCacheKey] = useState(storageKey);
  const [userId, setUserId] = useState<string | null>(null);
  const pendingBeforeHydration = useRef<SetStateAction<T>[]>([]);

  function applyPending(current: T): T {
    const updates = pendingBeforeHydration.current;
    pendingBeforeHydration.current = [];
    let value = current;
    for (const update of updates) {
      value = typeof update === "function"
        ? (update as (previous: T) => T)(value) : update;
    }
    return value;
  }

  useEffect(() => {
    let active = true;
    async function hydrate() {
      let authenticatedUserId: string | null = null;
      if (isSupabaseConfigured()) {
        try {
          const client = createClient();
          const { data: { user } } = await client.auth.getUser();
          if (user) {
            authenticatedUserId = user.id;
            const userCacheKey = `${storageKey}:${user.id}`;
            const [migrated, cloudValue] = await Promise.all([
              isCollectionMigrated(client, user.id, collection),
              readCloudCollection(client, user.id, collection),
            ]);
            let initial: T;
            if (migrated) {
              initial = cloudValue === undefined ? initialValue : cloudValue as T;
            } else {
              const { data: legacy, error } = await client.from("user_data")
                .select("payload").eq("user_id", user.id).eq("collection", collection).maybeSingle();
              if (error) throw error;
              const importedBefore = readCacheFlag(`assistant:legacy-imported:${collection}`);
              const hasCloudContent = Array.isArray(cloudValue)
                ? cloudValue.length > 0
                : cloudValue !== undefined && cloudValue !== null &&
                  (typeof cloudValue !== "object" || Object.keys(cloudValue).length > 0);
              initial = legacy
                ? legacy.payload as T
                : hasCloudContent
                  ? cloudValue as T
                  : cachedValue(userCacheKey, importedBefore ? initialValue : cachedValue(storageKey, initialValue));
              // A previous interrupted migration may have written some new rows.
              // Repeat upserts safely, then mark the collection as migrated.
              await writeCloudCollection(client, user.id, collection, cloudValue, initial);
              await markCollectionMigrated(client, user.id, collection);
              try { localStorage.setItem(`assistant:legacy-imported:${collection}`, "1"); }
              catch { /* The database marker is authoritative. */ }
            }
            if (!active) return;
            const snapshotKey = keyFor(user.id, collection);
            if (!pendingWrites.has(snapshotKey)) snapshots.set(snapshotKey, initial);
            if (sharedValues.has(snapshotKey)) initial = sharedValues.get(snapshotKey) as T;
            initial = applyPending(initial);
            publish(snapshotKey, initial);
            cacheValue(userCacheKey, initial);
            setCacheKey(userCacheKey);
            setUserId(user.id);
            setValue(initial);
            setHydrated(true);
            return;
          }
        } catch (error) {
          console.error(`Could not load ${collection} from Supabase`, error);
        }
      }
      if (active) {
        const fallbackKey = authenticatedUserId ? `${storageKey}:${authenticatedUserId}` : storageKey;
        const localKey = `local:${storageKey}`;
        const localValue = sharedValues.has(localKey)
          ? sharedValues.get(localKey) as T : cachedValue(fallbackKey, initialValue);
        const resolved = applyPending(localValue);
        publish(localKey, resolved);
        setCacheKey(fallbackKey);
        setUserId(null);
        setValue(resolved);
        setHydrated(true);
      }
    }
    void hydrate();
    return () => { active = false; };
    // Initial values are constants for a collection, not reactive inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection, storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    const key = userId ? keyFor(userId, collection) : `local:${storageKey}`;
    const listener = (next: unknown) => setValue(next as T);
    const group = subscribers.get(key) ?? new Set<(value: unknown) => void>();
    group.add(listener);
    subscribers.set(key, group);
    return () => {
      group.delete(listener);
      if (group.size === 0) subscribers.delete(key);
    };
  }, [collection, hydrated, storageKey, userId]);

  const updateValue = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    if (!hydrated) {
      pendingBeforeHydration.current.push(next);
      setValue((previous) => typeof next === "function"
        ? (next as (current: T) => T)(previous) : next);
      return;
    }
    const key = userId ? keyFor(userId, collection) : `local:${storageKey}`;
    const previous = sharedValues.has(key) ? sharedValues.get(key) as T : value;
    const updated = typeof next === "function"
      ? (next as (current: T) => T)(previous) : next;
    publish(key, updated);
    setValue(updated);
  }, [collection, hydrated, storageKey, userId, value]);

  useEffect(() => {
    if (!hydrated) return;
    cacheValue(cacheKey, value);
    if (userId) queueWrite(userId, collection, value);
  }, [cacheKey, collection, hydrated, userId, value]);

  return { value, setValue: updateValue, hydrated };
}
