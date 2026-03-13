import Point from '@/models/Point';

type PointLike = {
  _id: unknown;
  branchId?: unknown;
  zoneId?: string | null;
  name?: string | null;
  nameAr?: string | null;
  nameEn?: string | null;
};

type ResolveAtharPointInput = {
  branchId?: string | null;
  zoneIdRaw?: string | null;
  zoneIdNormalized?: string | null;
  zoneName?: string | null;
  desc?: string | null;
  eventName?: string | null;
};

function toCleanString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim();
  return cleaned ? cleaned : null;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const cleaned = toCleanString(value);
    if (!cleaned) continue;
    if (seen.has(cleaned)) continue;
    seen.add(cleaned);
    output.push(cleaned);
  }

  return output;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractNumericZoneId(value: string | null | undefined): string | null {
  const normalized = toCleanString(value);
  if (!normalized) return null;

  const fullNumber = normalized.match(/^(\d+)$/);
  if (fullNumber) return fullNumber[1];

  const embedded = normalized.match(/(\d+)/);
  return embedded ? embedded[1] : normalized;
}

export function normalizeZoneLabel(value: string | null | undefined): string | null {
  const cleaned = toCleanString(value);
  if (!cleaned) return null;
  if (/^\d+$/.test(cleaned)) return `النقطة ${cleaned}`;
  return cleaned;
}

function stripZoneEventSuffix(value: string | null | undefined): string | null {
  const cleaned = toCleanString(value);
  if (!cleaned) return null;
  return cleaned.replace(/\s*-\s*(دخول|خروج)\s*$/u, '').trim() || null;
}

function buildPointZoneIdCandidates(input: ResolveAtharPointInput): string[] {
  return uniqueStrings([
    extractNumericZoneId(input.zoneIdRaw),
    extractNumericZoneId(input.zoneIdNormalized),
    extractNumericZoneId(input.zoneName),
    extractNumericZoneId(input.desc),
    extractNumericZoneId(stripZoneEventSuffix(input.eventName)),
  ]);
}

function buildPointNameCandidates(input: ResolveAtharPointInput): string[] {
  const strippedEventName = stripZoneEventSuffix(input.eventName);
  const zoneNumber = extractNumericZoneId(input.zoneName);
  const descNumber = extractNumericZoneId(input.desc);
  const normalizedZoneId = extractNumericZoneId(input.zoneIdNormalized);

  return uniqueStrings([
    input.zoneName,
    normalizeZoneLabel(input.zoneName),
    strippedEventName,
    normalizeZoneLabel(strippedEventName),
    zoneNumber,
    zoneNumber ? `النقطة ${zoneNumber}` : null,
    descNumber,
    descNumber ? `النقطة ${descNumber}` : null,
    normalizedZoneId,
    normalizedZoneId ? `النقطة ${normalizedZoneId}` : null,
  ]);
}

async function findPointByZoneId(branchId: string | null | undefined, zoneIds: string[]): Promise<PointLike | null> {
  if (zoneIds.length === 0) return null;

  const filters = branchId
    ? [{ branchId, zoneId: { $in: zoneIds } }, { zoneId: { $in: zoneIds } }]
    : [{ zoneId: { $in: zoneIds } }];

  for (const filter of filters) {
    const point = await Point.findOne(filter)
      .select('_id branchId zoneId name nameAr nameEn')
      .lean<PointLike | null>();
    if (point) return point;
  }

  return null;
}

async function findPointByName(branchId: string | null | undefined, names: string[]): Promise<PointLike | null> {
  if (names.length === 0) return null;

  const numericCandidates = uniqueStrings(names.map((value) => extractNumericZoneId(value)));
  const regexes = numericCandidates.flatMap((numeric) => [
    new RegExp(`^${escapeRegExp(numeric)}$`, 'i'),
    new RegExp(`^النقطة\\s*${escapeRegExp(numeric)}$`, 'u'),
    new RegExp(`^point\\s*${escapeRegExp(numeric)}$`, 'iu'),
  ]);

  const orConditions: Array<Record<string, unknown>> = [];

  if (names.length > 0) {
    orConditions.push({ name: { $in: names } });
    orConditions.push({ nameAr: { $in: names } });
    orConditions.push({ nameEn: { $in: names } });
  }

  if (regexes.length > 0) {
    orConditions.push({ name: { $in: regexes } });
    orConditions.push({ nameAr: { $in: regexes } });
    orConditions.push({ nameEn: { $in: regexes } });
  }

  if (orConditions.length === 0) return null;

  const filters = branchId
    ? [{ branchId, $or: orConditions }, { $or: orConditions }]
    : [{ $or: orConditions }];

  for (const filter of filters) {
    const point = await Point.findOne(filter)
      .select('_id branchId zoneId name nameAr nameEn')
      .lean<PointLike | null>();
    if (point) return point;
  }

  return null;
}

export async function resolveAtharPoint(input: ResolveAtharPointInput): Promise<PointLike | null> {
  const zoneIds = buildPointZoneIdCandidates(input);
  const names = buildPointNameCandidates(input);

  const byZoneId = await findPointByZoneId(input.branchId, zoneIds);
  if (byZoneId) return byZoneId;

  return findPointByName(input.branchId, names);
}

export function buildZoneEventPointMatchers(point: {
  _id: unknown;
  zoneId?: string | null;
  name?: string | null;
  nameAr?: string | null;
  nameEn?: string | null;
}): Array<Record<string, unknown>> {
  const matchers: Array<Record<string, unknown>> = [{ pointId: point._id }];
  const zoneId = toCleanString(point.zoneId);
  const exactNames = uniqueStrings([
    point.nameAr,
    point.name,
    point.nameEn,
    normalizeZoneLabel(point.nameAr),
    normalizeZoneLabel(point.name),
    normalizeZoneLabel(point.nameEn),
  ]);

  if (zoneId) {
    matchers.push({ zoneId });
  }

  for (const name of exactNames) {
    matchers.push({ name: new RegExp(`^${escapeRegExp(name)}\\s*-\\s*(دخول|خروج)$`, 'u') });
  }

  return matchers;
}
