import test from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DATA_COLLECTIONS, mergeCollection, parseAssistantBackup, type AssistantBackup } from "../src/lib/data-transfer";
import { readCloudCollection, writeCloudCollection } from "../src/lib/supabase/collection-store";

type Row = Record<string, unknown>;

class MemoryQuery {
  private database: MemoryDatabase;
  private table: string;
  private filters: Array<(row: Row) => boolean> = [];
  private sortKey = "id";
  private start = 0;
  private end = Infinity;
  private removing = false;

  constructor(database: MemoryDatabase, table: string) {
    this.database = database;
    this.table = table;
  }
  select() { return this; }
  delete() { this.removing = true; return this; }
  eq(key: string, value: unknown) { this.filters.push((row) => row[key] === value); return this; }
  in(key: string, values: unknown[]) { this.filters.push((row) => values.includes(row[key])); return this; }
  order(key: string) { this.sortKey = key; return this; }
  range(start: number, end: number) { this.start = start; this.end = end; return this; }
  async maybeSingle() { return { data: this.rows()[0] ?? null, error: null }; }
  private rows() { return this.database.rows(this.table).filter((row) => this.filters.every((filter) => filter(row))); }
  then(resolve: (result: { data: Row[] | null; error: null }) => unknown) {
    if (this.removing) {
      const selected = new Set(this.rows());
      this.database.replace(this.table, this.database.rows(this.table).filter((row) => !selected.has(row)));
      return Promise.resolve(resolve({ data: null, error: null }));
    }
    const rows = this.rows().sort((a, b) => String(a[this.sortKey]).localeCompare(String(b[this.sortKey])));
    return Promise.resolve(resolve({ data: rows.slice(this.start, this.end + 1), error: null }));
  }
}

class MemoryDatabase {
  private tables = new Map<string, Row[]>();
  rows(table: string) { return this.tables.get(table) ?? []; }
  replace(table: string, rows: Row[]) { this.tables.set(table, rows); }
  from(table: string) {
    return Object.assign(new MemoryQuery(this, table), {
      upsert: async (rows: Row | Row[], options: { onConflict: string }) => {
        const keys = options.onConflict.split(",");
        const stored = [...this.rows(table)];
        for (const row of Array.isArray(rows) ? rows : [rows]) {
          const index = stored.findIndex((old) => keys.every((key) => old[key] === row[key]));
          if (index >= 0) stored[index] = row;
          else stored.push(row);
        }
        this.replace(table, stored);
        return { error: null };
      },
    });
  }
  client() { return this as unknown as SupabaseClient; }
}

const stamp = "2026-01-01T00:00:00.000Z";
const contents = {
  "saved-instructions": [{ id: "instruction-1", title: "Tone", content: "Be brief", category: "ai-prompt", tags: ["writing"], pinned: true, createdAt: stamp, updatedAt: stamp }],
  "command-library": [{ id: "command-1", title: "Status", command: "git status", description: "Show changes", category: "git", tags: ["git"], favorite: false, createdAt: stamp, updatedAt: stamp }],
  "daily-status-log": { date: "2026-01-01", dayName: "Thursday", dateLabel: "01/01/2026", items: "Ship fix", updatedAt: stamp },
  "model-settings": { provider: "gemini", model: "gemini-2.5-flash" },
  "usage-log": [{ id: "usage-1", toolId: "chat", provider: "gemini", model: "gemini-2.5-flash", prompt: "Hi", text: "Hello", createdAt: stamp }],
  "chat-history": [{ id: "chat-1", role: "user", text: "Hi" }],
  "command-center-history": [{ id: "center-1", role: "assistant", text: "Done" }],
  "personal-tasks": [{ id: "task-1", title: "Pay bill", description: "", priority: "high", dueDate: "2026-01-02", dueTime: null, createdAt: stamp, updatedAt: stamp, completedAt: null }],
  drafts: { chat: { input: "unfinished" } },
} as const;

test("a new account with no rows exports a valid empty backup", async () => {
  const database = new MemoryDatabase();
  const client = database.client();
  const collections: Record<string, unknown> = {};
  for (const collection of DATA_COLLECTIONS) collections[collection] = await readCloudCollection(client, "new-user", collection);
  const backup: AssistantBackup = { format: "my-assistant-backup", version: 1, exportedAt: stamp, collections };
  const parsed = parseAssistantBackup(JSON.stringify(backup));
  assert.deepEqual(parsed.collections["command-library"], []);
  assert.deepEqual(parsed.collections.drafts, {});
  assert.equal(parsed.collections["daily-status-log"], undefined);
});

test("all normalized collections survive JSON export and import", async () => {
  const source = new MemoryDatabase();
  const destination = new MemoryDatabase();
  const exported: Record<string, unknown> = {};
  for (const collection of DATA_COLLECTIONS) {
    await writeCloudCollection(source.client(), "source-user", collection, undefined, contents[collection]);
    exported[collection] = await readCloudCollection(source.client(), "source-user", collection);
  }
  const backup = parseAssistantBackup(JSON.stringify({
    format: "my-assistant-backup", version: 1, exportedAt: stamp, collections: exported,
  }));
  for (const collection of DATA_COLLECTIONS) {
    await writeCloudCollection(destination.client(), "destination-user", collection, undefined, backup.collections[collection]);
    assert.deepEqual(await readCloudCollection(destination.client(), "destination-user", collection), exported[collection]);
  }
});

test("merge keeps existing records and replace removes records absent from backup", async () => {
  const database = new MemoryDatabase();
  const client = database.client();
  const existing = contents["command-library"];
  const imported = [{ ...existing[0], id: "command-2", title: "Second" }];
  await writeCloudCollection(client, "user", "command-library", [], existing);
  const merged = mergeCollection("command-library", existing, [...existing, ...imported]);
  await writeCloudCollection(client, "user", "command-library", existing, merged);
  assert.equal((await readCloudCollection(client, "user", "command-library") as unknown[]).length, 2);
  await writeCloudCollection(client, "user", "command-library", merged, imported);
  assert.deepEqual(await readCloudCollection(client, "user", "command-library"), imported);
});

test("merge before lazy migration carries legacy records into normalized tables", async () => {
  const database = new MemoryDatabase();
  const client = database.client();
  const legacy = contents["command-library"];
  const imported = [{ ...legacy[0], id: "command-2", title: "Imported" }];
  const cloudPrevious = await readCloudCollection(client, "user", "command-library");
  const next = mergeCollection("command-library", legacy, imported);
  await writeCloudCollection(client, "user", "command-library", cloudPrevious, next);
  assert.deepEqual(await readCloudCollection(client, "user", "command-library"), [legacy[0], imported[0]]);
});

test("rejects backup records missing fields required by normalized tables", () => {
  assert.throws(() => parseAssistantBackup(JSON.stringify({
    format: "my-assistant-backup", version: 1, collections: { "usage-log": [{ id: "bad", prompt: "Hi", text: "Hello" }] },
  })), /Invalid data in usage-log/);
});

test("rejects invalid personal task deadlines in a backup", () => {
  const invalid = { ...contents["personal-tasks"][0], dueDate: "2026-02-31" };
  assert.throws(() => parseAssistantBackup(JSON.stringify({
    format: "my-assistant-backup", version: 1, collections: { "personal-tasks": [invalid] },
  })), /Invalid data in personal-tasks/);
});
