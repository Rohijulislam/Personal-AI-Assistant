export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function formatDateMDY(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

export function getDayName(date: Date): string {
  return DAY_NAMES[date.getDay()];
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/** Walks backward from `date` to the nearest prior weekday, skipping Sat/Sun. */
export function getPreviousBusinessDay(date: Date): Date {
  const result = new Date(date);
  do {
    result.setDate(result.getDate() - 1);
  } while (isWeekend(result));
  return result;
}

/** Local (not UTC) YYYY-MM-DD — safe to use as a same-day storage key. */
export function toISODateLocal(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * "Today is Monday 09/22/2026. Yesterday was Friday 09/19/2026." — "yesterday"
 * is the last business day, so a Monday run doesn't land on the weekend.
 */
export function buildDailyStatusDateContext(today: Date = new Date()): string {
  const lastBusinessDay = getPreviousBusinessDay(today);
  return `Today is ${getDayName(today)} ${formatDateMDY(today)}. Yesterday was ${getDayName(lastBusinessDay)} ${formatDateMDY(lastBusinessDay)}.`;
}
