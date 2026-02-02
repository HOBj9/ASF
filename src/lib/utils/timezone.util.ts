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
