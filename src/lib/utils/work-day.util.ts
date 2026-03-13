/**
 * Work Day Utilities
 * Logic for determining work days from WorkSchedule and matching visits
 */

import { getTimeZoneOffsetMs, getZonedDateString } from './timezone.util';

export interface WorkScheduleDayDef {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface WorkDayEntry {
  date: Date;
  dateStr: string;
  dayOfWeek: number;
  start: Date;
  end: Date;
  startTime: string;
  endTime: string;
}

/**
 * Get day of week (0=Sunday, 6=Saturday) for a date in the given timezone
 */
export function getDayOfWeekInTimezone(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  });
  const weekday = formatter.format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? 0;
}

/**
 * Parse "HH:mm" or "H:mm" to { hours, minutes }
 */
function parseTime(timeStr: string): { hours: number; minutes: number } {
  const parts = (timeStr || '00:00').trim().split(':');
  const hours = Math.min(23, Math.max(0, parseInt(parts[0] || '0', 10) || 0));
  const minutes = Math.min(59, Math.max(0, parseInt(parts[1] || '0', 10) || 0));
  return { hours, minutes };
}

/**
 * Get date string YYYY-MM-DD in timezone for a given date
 */
function getDateStrInTimezone(date: Date, timeZone: string): string {
  return getZonedDateString(timeZone, date);
}

/**
 * Build start and end Date for a work day: dateStr (YYYY-MM-DD) + startTime/endTime in timezone
 */
export function getWorkDayRangeForDate(
  dateOrStr: Date | string,
  startTimeOrSchedule: string | { days: WorkScheduleDayDef[] },
  endTimeOrTimezone?: string,
  timeZone?: string
): { start: Date; end: Date } | null {
  if (typeof dateOrStr === 'object' && typeof startTimeOrSchedule === 'object') {
    const date = dateOrStr as Date;
    const workSchedule = startTimeOrSchedule;
    const tz = endTimeOrTimezone ?? 'UTC';
    const dateStr = getDateStrInTimezone(date, tz);
    const dayOfWeek = getDayOfWeekInTimezone(date, tz);
    const dayDef = scheduleHasDay(workSchedule, dayOfWeek);
    if (!dayDef) return null;
    return getWorkDayRangeForDateRaw(dateStr, dayDef.startTime, dayDef.endTime, tz);
  }
  return getWorkDayRangeForDateRaw(
    dateOrStr as string,
    startTimeOrSchedule as string,
    endTimeOrTimezone!,
    timeZone!
  );
}

function getWorkDayRangeForDateRaw(
  dateStr: string,
  startTime: string,
  endTime: string,
  timeZone: string
): { start: Date; end: Date } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const startParsed = parseTime(startTime);
  const endParsed = parseTime(endTime);

  const guessStartUtc = Date.UTC(y, m - 1, d, startParsed.hours, startParsed.minutes, 0, 0);
  const guessEndUtc = Date.UTC(y, m - 1, d, endParsed.hours, endParsed.minutes, 59, 999);

  const offsetStart = getTimeZoneOffsetMs(new Date(guessStartUtc), timeZone);
  const offsetEnd = getTimeZoneOffsetMs(new Date(guessEndUtc), timeZone);

  const start = new Date(guessStartUtc - offsetStart);
  const end = new Date(guessEndUtc - offsetEnd);

  return { start, end };
}

/**
 * Check if work schedule has the given dayOfWeek
 */
function scheduleHasDay(workSchedule: { days: WorkScheduleDayDef[] }, dayOfWeek: number): WorkScheduleDayDef | undefined {
  return workSchedule.days?.find((d) => d.dayOfWeek === dayOfWeek);
}

/**
 * Enumerate all work days in the date range.
 * Each date from fromDate to toDate is checked; if its dayOfWeek matches work schedule, it's included.
 */
export function enumerateWorkDaysInRange(
  fromDate: Date,
  toDate: Date,
  workSchedule: { days: WorkScheduleDayDef[] },
  timeZone: string
): WorkDayEntry[] {
  if (!workSchedule?.days?.length) return [];

  const result: WorkDayEntry[] = [];
  const current = new Date(fromDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(toDate);
  end.setHours(23, 59, 59, 999);

  while (current.getTime() <= end.getTime()) {
    const dayOfWeek = getDayOfWeekInTimezone(current, timeZone);
    const dayDef = scheduleHasDay(workSchedule, dayOfWeek);
    if (dayDef) {
      const dateStr = getDateStrInTimezone(current, timeZone);
      const { start, end: endTime } = getWorkDayRangeForDateRaw(
        dateStr,
        dayDef.startTime,
        dayDef.endTime,
        timeZone
      );
      result.push({
        date: new Date(current.getTime()),
        dateStr,
        dayOfWeek,
        start,
        end: endTime,
        startTime: dayDef.startTime,
        endTime: dayDef.endTime,
      });
    }
    current.setDate(current.getDate() + 1);
  }

  return result;
}

/**
 * Check if a visit's entryTime falls within any work day of the schedule for that date
 */
export function isWithinWorkDay(
  visitTime: Date,
  workSchedule: { days: WorkScheduleDayDef[] },
  timeZone: string
): boolean {
  if (!workSchedule?.days?.length) return false;
  const range = getWorkDayRangeForDate(visitTime, workSchedule, timeZone);
  if (!range) return false;
  const { start, end } = range;
  const t = visitTime.getTime();
  return t >= start.getTime() && t <= end.getTime();
}
