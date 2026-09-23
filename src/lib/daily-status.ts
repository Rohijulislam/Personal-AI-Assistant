import type { DailyStatusEntry } from "@/types";
import { getPreviousBusinessDay, toISODateLocal } from "@/lib/date-utils";

const YESTERDAY_HEADERS = new Set([
  "y",
  "yesterday",
  "worked on",
  "done",
  "completed",
]);

const TODAY_HEADERS = new Set(["t", "today", "planned", "planned for", "tomorrow"]);

// Matches an explicit past-date header, e.g. "09/11/2026", "9/10/26", "Sep 10", "10th".
const DATE_HEADER_RE =
  /^(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4}|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(st|nd|rd|th)?|\d{1,2}(st|nd|rd|th))$/i;

type SectionKind = "yesterday" | "today" | "unknown";

interface Section {
  body: string;
  kind: SectionKind;
}

/** Splits raw standup notes into blank-line-separated sections and classifies each by its header line. */
function splitSections(raw: string): Section[] {
  return raw
    .trim()
    .split(/\n\s*\n+/)
    .filter((block) => block.trim())
    .map((block) => {
      const lines = block.split("\n");
      const header = lines[0].trim().toLowerCase();
      const body = lines.slice(1).join("\n").trim();
      let kind: SectionKind = "unknown";
      if (YESTERDAY_HEADERS.has(header) || DATE_HEADER_RE.test(header)) {
        kind = "yesterday";
      } else if (TODAY_HEADERS.has(header)) {
        kind = "today";
      }
      return { body, kind };
    });
}

/** True when the user already typed a past-work section (y/yesterday/worked on/done/completed or an explicit date). */
export function hasPastSection(raw: string): boolean {
  return splitSections(raw).some((s) => s.kind === "yesterday");
}

/** Pulls the "today"/"planned" bullet text out of raw notes, for saving as tomorrow's default "yesterday". */
export function extractTodayItems(raw: string): string | null {
  const items = splitSections(raw)
    .filter((s) => s.kind === "today" && s.body)
    .map((s) => s.body)
    .join("\n");
  return items || null;
}

export interface AutoFillResult {
  input: string;
  autoFilled: boolean;
}

/**
 * If the user didn't type a past-work section, and the last saved entry is from the
 * previous business day, prepend it as a "y" section so they don't have to retype it.
 */
export function prepareInputWithAutoFill(
  raw: string,
  lastEntry: DailyStatusEntry | null,
  today: Date = new Date(),
): AutoFillResult {
  if (hasPastSection(raw) || !lastEntry?.items.trim()) {
    return { input: raw, autoFilled: false };
  }
  const expectedDate = toISODateLocal(getPreviousBusinessDay(today));
  if (lastEntry.date !== expectedDate) {
    return { input: raw, autoFilled: false };
  }
  const yesterdayBlock = `y\n${lastEntry.items.trim()}`;
  const input = raw.trim() ? `${yesterdayBlock}\n\n${raw.trim()}` : yesterdayBlock;
  return { input, autoFilled: true };
}
