import type { SupabaseClient } from "@supabase/supabase-js";
import type { DataCollection } from "@/lib/data-transfer";

type JsonRecord = Record<string, unknown>;
type ListCollection = "command-library" | "saved-instructions" | "usage-log" | "chat-history" | "command-center-history" | "personal-tasks";

const TABLES: Record<ListCollection, string> = {
  "command-library": "saved_commands",
  "saved-instructions": "saved_instructions",
  "usage-log": "generation_history",
  "chat-history": "conversation_messages",
  "command-center-history": "conversation_messages",
  "personal-tasks": "personal_tasks",
};

function record(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as JsonRecord : {};
}

function list(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.map(record).filter((item) => typeof item.id === "string") : [];
}

function isListCollection(collection: DataCollection): collection is ListCollection {
  return Object.hasOwn(TABLES, collection);
}

async function allRows(client: SupabaseClient, table: string, userId: string, collection?: string): Promise<JsonRecord[]> {
  const rows: JsonRecord[] = [];
  for (let start = 0; ; start += 500) {
    let query = client.from(table).select("*").eq("user_id", userId)
      .order(table === "tool_drafts" ? "tool" : "id").range(start, start + 499);
    if (collection) query = query.eq("conversation", collection);
    const { data, error } = await query;
    if (error) throw error;
    const page = (data ?? []) as JsonRecord[];
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}

function rowToItem(collection: ListCollection, row: JsonRecord): JsonRecord {
  if (collection === "command-library") return {
    id: row.id, title: row.title, command: row.command, description: row.description,
    category: row.category, tags: row.tags, favorite: row.favorite,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
  if (collection === "saved-instructions") return {
    id: row.id, title: row.title, content: row.content, category: row.category,
    tags: row.tags, pinned: row.pinned, createdAt: row.created_at, updatedAt: row.updated_at,
  };
  if (collection === "usage-log") return {
    id: row.id, toolId: row.tool_id, provider: row.provider, model: row.model,
    prompt: row.prompt, text: row.output, createdAt: row.created_at,
  };
  if (collection === "personal-tasks") return {
    id: row.id, title: row.title, description: row.description, priority: row.priority,
    dueDate: row.due_date, dueTime: row.due_time ? String(row.due_time).slice(0, 5) : null,
    createdAt: row.created_at, updatedAt: row.updated_at, completedAt: row.completed_at,
  };
  return record(row.payload);
}

function itemToRow(collection: ListCollection, userId: string, item: JsonRecord, position: number): JsonRecord {
  if (collection === "command-library") return {
    user_id: userId, id: item.id, title: item.title, command: item.command,
    description: item.description, category: item.category, tags: item.tags,
    favorite: item.favorite, created_at: item.createdAt, updated_at: item.updatedAt,
  };
  if (collection === "saved-instructions") return {
    user_id: userId, id: item.id, title: item.title, content: item.content,
    category: item.category, tags: item.tags, pinned: item.pinned,
    created_at: item.createdAt, updated_at: item.updatedAt,
  };
  if (collection === "usage-log") return {
    user_id: userId, id: item.id, tool_id: item.toolId, provider: item.provider,
    model: item.model, prompt: item.prompt, output: item.text, created_at: item.createdAt,
  };
  if (collection === "personal-tasks") return {
    user_id: userId, id: item.id, title: item.title, description: item.description,
    priority: item.priority, due_date: item.dueDate, due_time: item.dueTime,
    created_at: item.createdAt, updated_at: item.updatedAt, completed_at: item.completedAt,
  };
  const { streamText: _streamText, ...payload } = item;
  void _streamText;
  return { user_id: userId, conversation: collection, id: item.id, position, payload, updated_at: new Date().toISOString() };
}

function persistedList(collection: ListCollection, value: unknown): JsonRecord[] {
  const items = list(value);
  // Streaming tokens are transient UI state; save an assistant message once it settles.
  return collection === "chat-history" || collection === "command-center-history"
    ? items.filter((item) => item.loading !== true)
    : items;
}

export async function readCloudCollection(client: SupabaseClient, userId: string, collection: DataCollection): Promise<unknown> {
  if (isListCollection(collection)) {
    const rows = await allRows(client, TABLES[collection], userId,
      collection === "chat-history" || collection === "command-center-history" ? collection : undefined);
    if (collection === "usage-log") rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    if (collection === "chat-history" || collection === "command-center-history") rows.sort((a, b) => Number(a.position) - Number(b.position));
    return rows.map((row) => rowToItem(collection, row)).filter((item) => item.loading !== true);
  }
  if (collection === "drafts") {
    const rows = await allRows(client, "tool_drafts", userId);
    return Object.fromEntries(rows.map((row) => [String(row.tool), row.payload]));
  }
  const { data, error } = await client.from("app_settings").select("payload")
    .eq("user_id", userId).eq("key", collection).maybeSingle();
  if (error) throw error;
  return data?.payload;
}

async function upsertBatches(client: SupabaseClient, table: string, rows: JsonRecord[], conflict: string): Promise<void> {
  for (let start = 0; start < rows.length; start += 100) {
    const { error } = await client.from(table).upsert(rows.slice(start, start + 100), { onConflict: conflict });
    if (error) throw error;
  }
}

async function deleteIds(client: SupabaseClient, table: string, userId: string, ids: string[], collection?: string): Promise<void> {
  for (let start = 0; start < ids.length; start += 100) {
    let query = client.from(table).delete().eq("user_id", userId).in("id", ids.slice(start, start + 100));
    if (collection) query = query.eq("conversation", collection);
    const { error } = await query;
    if (error) throw error;
  }
}

export async function writeCloudCollection(client: SupabaseClient, userId: string, collection: DataCollection, previous: unknown, next: unknown): Promise<void> {
  if (isListCollection(collection)) {
    const before = persistedList(collection, previous);
    const after = persistedList(collection, next);
    const oldRows = new Map(before.map((item, index) => [String(item.id), itemToRow(collection, userId, item, index)]));
    const newRows = after.map((item, index) => itemToRow(collection, userId, item, index));
    const changed = newRows.filter((row) => {
      const old = oldRows.get(String(row.id));
      if (collection === "chat-history" || collection === "command-center-history") {
        // updated_at is a write timestamp, not part of the message identity.
        return !old || old.position !== row.position || JSON.stringify(old.payload) !== JSON.stringify(row.payload);
      }
      return !old || JSON.stringify(old) !== JSON.stringify(row);
    });
    const newIds = new Set(newRows.map((row) => String(row.id)));
    const removed = [...oldRows.keys()].filter((id) => !newIds.has(id));
    const table = TABLES[collection];
    const conflict = collection === "chat-history" || collection === "command-center-history"
      ? "user_id,conversation,id" : "user_id,id";
    await upsertBatches(client, table, changed, conflict);
    await deleteIds(client, table, userId, removed,
      collection === "chat-history" || collection === "command-center-history" ? collection : undefined);
    return;
  }
  if (collection === "drafts") {
    const before = record(previous);
    const after = record(next);
    const changed = Object.entries(after).filter(([tool, payload]) => JSON.stringify(before[tool]) !== JSON.stringify(payload))
      .map(([tool, payload]) => ({ user_id: userId, tool, payload, updated_at: new Date().toISOString() }));
    await upsertBatches(client, "tool_drafts", changed, "user_id,tool");
    const removed = Object.keys(before).filter((tool) => !Object.hasOwn(after, tool));
    for (let start = 0; start < removed.length; start += 100) {
      const { error } = await client.from("tool_drafts").delete().eq("user_id", userId).in("tool", removed.slice(start, start + 100));
      if (error) throw error;
    }
    return;
  }
  if (JSON.stringify(previous) === JSON.stringify(next)) return;
  const { error } = await client.from("app_settings").upsert({
    user_id: userId, key: collection, payload: next, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,key" });
  if (error) throw error;
}

export async function isCollectionMigrated(client: SupabaseClient, userId: string, collection: DataCollection): Promise<boolean> {
  const { data, error } = await client.from("collection_migrations").select("collection")
    .eq("user_id", userId).eq("collection", collection).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function markCollectionMigrated(client: SupabaseClient, userId: string, collection: DataCollection): Promise<void> {
  const { error } = await client.from("collection_migrations").upsert({ user_id: userId, collection }, { onConflict: "user_id,collection" });
  if (error) throw error;
}
