/**
 * Client-safe labels utilities (no DB/Mongoose).
 * For server-only getLabelsForSession, use labels-server.util.ts.
 */

export type Labels = {
  branchLabel: string;
  pointLabel: string;
  vehicleLabel: string;
  driverLabel: string;
  routeLabel: string;
};

export const defaultLabels: Labels = {
  branchLabel: 'فرع',
  pointLabel: 'نقاط',
  vehicleLabel: 'مركبات',
  driverLabel: 'سائقين',
  routeLabel: 'مسارات',
};

/** Returns true if the string is empty or only question marks/spaces (corrupted encoding). */
function isCorruptedLabel(value: string | null | undefined): boolean {
  if (value == null || typeof value !== 'string') return true;
  const trimmed = value.trim();
  return trimmed.length === 0 || /^[\s?]+$/.test(trimmed);
}

/** Sanitize labels: use default for any key that is missing or corrupted (e.g. ???? from bad encoding). */
export function sanitizeLabels(labels: Partial<Labels> | null | undefined): Labels {
  const merged = { ...defaultLabels, ...labels };
  return {
    branchLabel: isCorruptedLabel(merged.branchLabel) ? defaultLabels.branchLabel : merged.branchLabel!,
    pointLabel: isCorruptedLabel(merged.pointLabel) ? defaultLabels.pointLabel : merged.pointLabel!,
    vehicleLabel: isCorruptedLabel(merged.vehicleLabel) ? defaultLabels.vehicleLabel : merged.vehicleLabel!,
    driverLabel: isCorruptedLabel(merged.driverLabel) ? defaultLabels.driverLabel : merged.driverLabel!,
    routeLabel: isCorruptedLabel(merged.routeLabel) ? defaultLabels.routeLabel : merged.routeLabel!,
  };
}
