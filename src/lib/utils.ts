import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export other utilities for convenience
export * from './utils/api.util';
export * from './utils/validation.util';
export * from './utils/format.util';

