export const DATA_COLLECTIONS = [
  "saved-instructions",
  "command-library",
  "daily-status-log",
  "model-settings",
  "usage-log",
  "chat-history",
  "command-center-history",
  "drafts",
] as const;

export type DataCollection = (typeof DATA_COLLECTIONS)[number];
export type CollectionPayloads = Partial<Record<DataCollection, unknown>>;
export type AssistantBackup = {
  format: "my-assistant-backup";
  version: 1;
  exportedAt: string;
  profile?: { displayName: string; email: string };
  collections: CollectionPayloads;
};

const LIST_COLLECTIONS: DataCollection[] = [
  "saved-instructions", "command-library", "usage-log", "chat-history", "command-center-history",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validTimestamp(value: unknown): boolean {
  return typeof value === "string" && value.length > 0 && !Number.isNaN(Date.parse(value));
}

export function validPayload(collection: DataCollection, value: unknown): boolean {
  if (LIST_COLLECTIONS.includes(collection)) {
    return Array.isArray(value) && value.every((item) => {
      if (!isRecord(item) || typeof item.id !== "string" || !item.id) return false;
      if (collection === "saved-instructions") return typeof item.title === "string" && typeof item.content === "string"
        && typeof item.category === "string" && Array.isArray(item.tags) && item.tags.every((tag) => typeof tag === "string")
        && typeof item.pinned === "boolean" && validTimestamp(item.createdAt) && validTimestamp(item.updatedAt);
      if (collection === "command-library") return typeof item.title === "string" && typeof item.command === "string"
        && typeof item.description === "string" && typeof item.category === "string"
        && Array.isArray(item.tags) && item.tags.every((tag) => typeof tag === "string")
        && typeof item.favorite === "boolean" && validTimestamp(item.createdAt) && validTimestamp(item.updatedAt);
      if (collection === "usage-log") return typeof item.toolId === "string" && typeof item.provider === "string"
        && typeof item.model === "string" && typeof item.prompt === "string" && typeof item.text === "string"
        && validTimestamp(item.createdAt);
      return (item.role === "user" || item.role === "assistant") && typeof item.text === "string";
    });
  }
  if (collection === "daily-status-log") return value === null || (isRecord(value) && typeof value.items === "string" && typeof value.date === "string");
  if (collection === "drafts") return isRecord(value) && Object.values(value).every((item) =>
    typeof item === "string" || (isRecord(item) && (!Object.hasOwn(item, "input") || typeof item.input === "string")),
  );
  return isRecord(value);
}

export function parseAssistantBackup(raw: string): AssistantBackup {
  const value: unknown = JSON.parse(raw);
  if (!isRecord(value) || value.format !== "my-assistant-backup" || value.version !== 1 || !isRecord(value.collections)) {
    throw new Error("This is not a supported My Assistant backup file.");
  }
  const collections: CollectionPayloads = {};
  for (const collection of DATA_COLLECTIONS) {
    if (!Object.hasOwn(value.collections, collection)) continue;
    const payload = value.collections[collection];
    if (!validPayload(collection, payload)) throw new Error(`Invalid data in ${collection}.`);
    collections[collection] = payload;
  }
  const profile = isRecord(value.profile) && typeof value.profile.displayName === "string" && typeof value.profile.email === "string"
    ? { displayName: value.profile.displayName, email: value.profile.email }
    : undefined;
  if (Object.keys(collections).length === 0 && !profile) throw new Error("The backup contains no app data.");
  return {
    format: "my-assistant-backup",
    version: 1,
    exportedAt: typeof value.exportedAt === "string" ? value.exportedAt : "",
    profile,
    collections,
  };
}

/** Merge inserts missing records. Current records and settings keep their values. */
export function mergeCollection(collection: DataCollection, current: unknown, incoming: unknown): unknown {
  if (!validPayload(collection, incoming)) throw new Error(`Invalid data in ${collection}.`);
  if (!validPayload(collection, current)) return incoming;
  if (LIST_COLLECTIONS.includes(collection)) {
    const existing = current as Array<{ id: string }>;
    const imported = incoming as Array<{ id: string }>;
    const ids = new Set(existing.map((item) => item.id));
    return [...existing, ...imported.filter((item) => !ids.has(item.id))];
  }
  if (collection === "daily-status-log") return current ?? incoming;
  return { ...(incoming as Record<string, unknown>), ...(current as Record<string, unknown>) };
}

export function collectionCount(collection: DataCollection, payload: unknown): string {
  if (LIST_COLLECTIONS.includes(collection)) return `${(payload as unknown[]).length} records`;
  if (collection === "drafts") return `${Object.keys(payload as object).length} tool drafts`;
  return payload === null ? "Empty" : "1 saved set";
}

export const COLLECTION_LABELS: Record<DataCollection, string> = {
  "saved-instructions": "Saved instructions",
  "command-library": "Command library",
  "daily-status-log": "Daily status notes",
  "model-settings": "Model settings",
  "usage-log": "Generation history",
  "chat-history": "Chat conversations",
  "command-center-history": "Command Center conversations",
  drafts: "Unfinished drafts",
};
