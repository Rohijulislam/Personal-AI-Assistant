"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Download, FileJson2, UploadCloud } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { flushPendingUserDataWrites } from "@/lib/hooks/useUserData";
import { isCollectionMigrated, markCollectionMigrated, readCloudCollection, writeCloudCollection } from "@/lib/supabase/collection-store";
import {
  COLLECTION_LABELS, DATA_COLLECTIONS, collectionCount, mergeCollection,
  parseAssistantBackup, validPayload, type AssistantBackup, type CollectionPayloads, type DataCollection,
} from "@/lib/data-transfer";
import type { SupabaseClient } from "@supabase/supabase-js";

type ImportMode = "merge" | "replace";
const STORAGE_KEYS: Record<DataCollection, string> = {
  "saved-instructions": "saved-instructions",
  "command-library": "command-library",
  "daily-status-log": "daily-status-log",
  "model-settings": "model-settings",
  "usage-log": "usage-log",
  "chat-history": "chat-history",
  "command-center-history": "command-center-history",
  drafts: "assistant:drafts",
};

function cachedPayload(key: string, collection: DataCollection): unknown {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return undefined;
    const value: unknown = JSON.parse(raw);
    return validPayload(collection, value) ? value : undefined;
  } catch { return undefined; }
}

function legacyCacheWasImported(collection: DataCollection): boolean {
  try { return localStorage.getItem(`assistant:legacy-imported:${collection}`) === "1"; }
  catch { return false; }
}

async function collectionForExport(client: SupabaseClient, userId: string, collection: DataCollection): Promise<unknown> {
  const cloud = await readCloudCollection(client, userId, collection);
  if (await isCollectionMigrated(client, userId, collection)) return cloud;

  // A user may open Account before ever visiting a tool page. Include their
  // untouched legacy data even though the lazy collection migration has not run.
  const { data: legacy, error } = await client.from("user_data").select("payload")
    .eq("user_id", userId).eq("collection", collection).maybeSingle();
  if (error) throw error;
  if (legacy && validPayload(collection, legacy.payload)) return legacy.payload;
  const hasCloudContent = Array.isArray(cloud) ? cloud.length > 0
    : cloud !== undefined && cloud !== null &&
      (typeof cloud !== "object" || Object.keys(cloud).length > 0);
  if (hasCloudContent) return cloud;
  const userCache = cachedPayload(`${STORAGE_KEYS[collection]}:${userId}`, collection);
  if (userCache !== undefined) return userCache;
  if (!legacyCacheWasImported(collection)) {
    const browserCache = cachedPayload(STORAGE_KEYS[collection], collection);
    if (browserCache !== undefined) return browserCache;
  }
  return cloud;
}

export function DataManager() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [backup, setBackup] = useState<AssistantBackup | null>(null);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<ImportMode>("merge");
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function getAccount() {
    const client = createClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) throw new Error("Your session has expired. Sign in again.");
    return { client, user };
  }

  async function exportData() {
    setBusy("export"); setMessage("");
    try {
      await flushPendingUserDataWrites();
      const { client, user } = await getAccount();
      const collections: CollectionPayloads = {};
      for (const collection of DATA_COLLECTIONS) {
        collections[collection] = await collectionForExport(client, user.id, collection);
      }
      const result: AssistantBackup = {
        format: "my-assistant-backup", version: 1,
        exportedAt: new Date().toISOString(),
        profile: { displayName: String(user.user_metadata?.display_name ?? ""), email: user.email ?? "" },
        collections,
      };
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `my-assistant-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setIsError(false);
      setMessage("Backup downloaded with your current cloud data.");
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Could not export your data.");
    } finally { setBusy(null); }
  }

  async function selectFile(file: File | undefined) {
    setBackup(null); setFileName(""); setMessage("");
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setIsError(true); setMessage("Choose a backup smaller than 20 MB."); return;
    }
    try {
      const parsed = parseAssistantBackup(await file.text());
      setBackup(parsed);
      setFileName(file.name);
      setIsError(false);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Could not read this file.");
    }
  }

  async function importData() {
    if (!backup) return;
    setBusy("import"); setMessage("");
    try {
      await flushPendingUserDataWrites();
      const { client, user } = await getAccount();
      const collections = DATA_COLLECTIONS.filter((collection) => Object.hasOwn(backup.collections, collection));
      for (const collection of collections) {
        const cloudPrevious = await readCloudCollection(client, user.id, collection);
        const existing = mode === "merge"
          ? await collectionForExport(client, user.id, collection) : cloudPrevious;
        const next = mode === "replace"
          ? backup.collections[collection]
          : mergeCollection(collection, existing, backup.collections[collection]);
        await writeCloudCollection(client, user.id, collection, cloudPrevious, next);
        await markCollectionMigrated(client, user.id, collection);
        try { localStorage.setItem(`${STORAGE_KEYS[collection]}:${user.id}`, JSON.stringify(next)); }
        catch { /* Cloud data remains the source of truth. */ }
      }
      let profileWarning = "";
      if (backup.profile?.displayName && (mode === "replace" || !user.user_metadata?.display_name)) {
        const { error: profileError } = await client.auth.updateUser({ data: { ...user.user_metadata, display_name: backup.profile.displayName } });
        if (profileError) profileWarning = " Profile name could not be updated.";
      }
      setIsError(false);
      setMessage(`Imported ${collections.length} sections.${profileWarning} Refreshing your workspace…`);
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Could not import this backup.");
    } finally { setBusy(null); }
  }

  return <div className="space-y-6">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-subtle text-accent"><Download className="h-5 w-5" /></span>
        <h3 className="mt-4 text-sm font-semibold text-text-primary">Export a backup</h3>
        <p className="mt-1 min-h-12 text-sm leading-6 text-text-muted">Download your saved content, conversations, settings, and drafts as a JSON file.</p>
        <button type="button" onClick={exportData} disabled={busy !== null} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface-raised px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:border-accent hover:text-accent disabled:opacity-50">
          <Download className="h-4 w-4" /> {busy === "export" ? "Preparing backup…" : "Download JSON"}
        </button>
      </div>
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-info-subtle text-info"><UploadCloud className="h-5 w-5" /></span>
        <h3 className="mt-4 text-sm font-semibold text-text-primary">Import a backup</h3>
        <p className="mt-1 min-h-12 text-sm leading-6 text-text-muted">Choose a My Assistant JSON backup. Review its contents before saving anything.</p>
        <input ref={inputRef} type="file" accept=".json,application/json" className="sr-only" onChange={(event) => void selectFile(event.target.files?.[0])} />
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy !== null} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface-raised px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:border-accent hover:text-accent disabled:opacity-50">
          <FileJson2 className="h-4 w-4" /> Choose JSON file
        </button>
      </div>
    </div>
    {backup && <div className="rounded-xl border border-border bg-surface-sunken p-4 sm:p-5">
      <div className="flex items-start gap-3"><FileJson2 className="mt-0.5 h-5 w-5 text-accent" /><div className="min-w-0"><p className="truncate text-sm font-semibold text-text-primary">{fileName}</p><p className="text-xs text-text-muted">{Object.keys(backup.collections).length} sections · Exported {backup.exportedAt ? new Date(backup.exportedAt).toLocaleString() : "on an unknown date"}</p></div></div>
      <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 border-t border-border pt-4 sm:grid-cols-2">
        {DATA_COLLECTIONS.filter((collection) => Object.hasOwn(backup.collections, collection)).map((collection) => <li key={collection} className="flex justify-between gap-3 text-xs"><span className="text-text-secondary">{COLLECTION_LABELS[collection]}</span><span className="text-text-muted">{collectionCount(collection, backup.collections[collection])}</span></li>)}
      </ul>
      <fieldset className="mt-5 space-y-2"><legend className="text-sm font-semibold text-text-primary">How should imported data be added?</legend>
        <label className="flex cursor-pointer gap-2.5 text-sm text-text-secondary"><input type="radio" name="import-mode" checked={mode === "merge"} onChange={() => setMode("merge")} className="accent-accent" /><span><strong className="text-text-primary">Add missing records</strong> — keep your existing items and settings.</span></label>
        <label className="flex cursor-pointer gap-2.5 text-sm text-text-secondary"><input type="radio" name="import-mode" checked={mode === "replace"} onChange={() => setMode("replace")} className="accent-accent" /><span><strong className="text-text-primary">Replace included sections</strong> — use the backup values for those sections.</span></label>
      </fieldset>
      <button type="button" onClick={importData} disabled={busy !== null} className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"><UploadCloud className="h-4 w-4" />{busy === "import" ? "Importing…" : "Import selected backup"}</button>
    </div>}
    {message && <p role="status" className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm ${isError ? "bg-danger-subtle text-danger" : "bg-success-subtle text-success"}`}>{!isError && <CheckCircle2 className="h-4 w-4 shrink-0" />}{message}</p>}
    <p className="text-xs leading-5 text-text-muted">Backups include saved text, including any credentials you entered in Saved Instructions. Store the file securely. Your account password and server API keys are not exported.</p>
  </div>;
}
