export function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const values: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  }
  const asUTC = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );
  return asUTC - date.getTime();
}

/** Returns date string YYYY-MM-DD in the given timezone for the given date */
export function getZonedDateString(timeZone: string, date: Date = new Date()): string {
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values: Record<string, string> = {};
  for (const part of dateParts) {
    if (part.type !== 'literal') values[part.type] = part.value;
  }
  return `${values.year}-${values.month}-${values.day}`;
}

export function getZonedDayRange(timeZone: string, now: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const values: Record<string, string> = {};
  for (const part of dateParts) {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  }

  const year = Number(values.year);
  const month = Number(values.month);
  const day = Number(values.day);

  const guessStartUtc = Date.UTC(year, month - 1, day, 0, 0, 0);
  const offsetStart = getTimeZoneOffsetMs(new Date(guessStartUtc), timeZone);
  const start = new Date(guessStartUtc - offsetStart);

  const guessEndUtc = Date.UTC(year, month - 1, day, 23, 59, 59, 999);
  const offsetEnd = getTimeZoneOffsetMs(new Date(guessEndUtc), timeZone);
  const end = new Date(guessEndUtc - offsetEnd);

  return { start, end };
}

export function getZonedMonthStart(timeZone: string, monthsAgo: number = 0): Date {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);

  const values: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  }

  let year = Number(values.year);
  let month = Number(values.month) - monthsAgo;

  while (month <= 0) {
    month += 12;
    year -= 1;
  }
  while (month > 12) {
    month -= 12;
    year += 1;
  }

  const guessStartUtc = Date.UTC(year, month - 1, 1, 0, 0, 0);
  const offsetStart = getTimeZoneOffsetMs(new Date(guessStartUtc), timeZone);
  return new Date(guessStartUtc - offsetStart);
}

export function getZonedWeekRange(
  timeZone: string,
  now: Date = new Date(),
  weekStartsOn: 0 | 1 = 1
): { start: Date; end: Date } {
  const todayRange = getZonedDayRange(timeZone, now);
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(now);

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const currentDay = weekdayMap[weekday] ?? 0;
  const delta = (currentDay - weekStartsOn + 7) % 7;
  const start = new Date(todayRange.start.getTime() - delta * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}

export function getZonedMonthRange(
  timeZone: string,
  now: Date = new Date()
): { start: Date; end: Date } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);

  const values: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') values[part.type] = part.value;
  }

  const year = Number(values.year);
  const month = Number(values.month);
  const guessStartUtc = Date.UTC(year, month - 1, 1, 0, 0, 0);
  const offsetStart = getTimeZoneOffsetMs(new Date(guessStartUtc), timeZone);
  const start = new Date(guessStartUtc - offsetStart);

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const guessNextMonthStartUtc = Date.UTC(nextYear, nextMonth - 1, 1, 0, 0, 0);
  const offsetNextMonth = getTimeZoneOffsetMs(new Date(guessNextMonthStartUtc), timeZone);
  const nextMonthStart = new Date(guessNextMonthStartUtc - offsetNextMonth);
  const end = new Date(nextMonthStart.getTime() - 1);

  return { start, end };
}

export function getZonedRangeByPeriod(
  timeZone: string,
  period: 'daily' | 'weekly' | 'monthly' | 'custom',
  from?: Date | null,
  to?: Date | null
): { start: Date; end: Date } {
  if (period === 'custom') {
    if (!from || !to) {
      throw new Error('يجب تحديد من وإلى للفترة المخصصة');
    }
    return { start: from, end: to };
  }

  if (period === 'weekly') {
    return getZonedWeekRange(timeZone);
  }

  if (period === 'monthly') {
    return getZonedMonthRange(timeZone);
  }

  return getZonedDayRange(timeZone);
}
