/**
 * Theme Helper Utilities
 * Easy access to theme colors and configurations
 */

import { themeConfig } from "@/lib/config/theme.config";

/**
 * Get status color classes
 */
export const getStatusColor = (status: 'success' | 'error' | 'warning' | 'info' | 'pending') => {
  return themeConfig.colors.status[status];
};

/**
 * Get table color classes
 */
export const getTableColors = () => {
  return themeConfig.colors.table;
};

/**
 * Get widget color classes
 */
export const getWidgetColors = () => {
  return themeConfig.colors.widget;
};

/**
 * Get icon color classes
 */
export const getIconColors = () => {
  return themeConfig.colors.icon;
};

/**
 * Get sidebar color classes
 */
export const getSidebarColors = () => {
  return themeConfig.colors.sidebar;
};

/**
 * Get toast color classes
 */
export const getToastColors = (type: 'success' | 'error' | 'info' | 'warning') => {
  return themeConfig.colors.toast[type];
};

/**
 * Get loader color classes
 */
export const getLoaderColors = () => {
  return themeConfig.colors.loader;
};

/**
 * Get status badge configuration
 */
export const getStatusBadge = (type: 'session' | 'message' | 'campaign', status: string) => {
  const badges = themeConfig.statusBadges[type] as any;
  return badges[status] || null;
};

/**
 * Combine multiple color classes
 */
export const combineColors = (...classes: (string | undefined | null)[]): string => {
  return classes.filter(Boolean).join(' ');
};

