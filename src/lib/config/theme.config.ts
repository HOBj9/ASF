/**
 * Centralized Theme Configuration
 * Single source of truth for all colors and theme values
 * All colors use CSS variables from globals.css
 */

export const themeConfig = {
  colors: {
    // ============================================
    // Status Colors
    // ============================================
    status: {
      success: {
        bg: "bg-[hsl(var(--success-bg))]",
        text: "text-[hsl(var(--success))]",
        border: "border-[hsl(var(--success-border))]",
        hover: "hover:bg-[hsl(var(--success-bg-hover))]",
        full: "bg-[hsl(var(--success-bg))] text-[hsl(var(--success))] border-[hsl(var(--success-border))]",
      },
      error: {
        bg: "bg-[hsl(var(--error-bg))]",
        text: "text-[hsl(var(--error))]",
        border: "border-[hsl(var(--error-border))]",
        hover: "hover:bg-[hsl(var(--error-bg-hover))]",
        full: "bg-[hsl(var(--error-bg))] text-[hsl(var(--error))] border-[hsl(var(--error-border))]",
      },
      warning: {
        bg: "bg-[hsl(var(--warning-bg))]",
        text: "text-[hsl(var(--warning))]",
        border: "border-[hsl(var(--warning-border))]",
        hover: "hover:bg-[hsl(var(--warning-bg-hover))]",
        full: "bg-[hsl(var(--warning-bg))] text-[hsl(var(--warning))] border-[hsl(var(--warning-border))]",
      },
      info: {
        bg: "bg-[hsl(var(--info-bg))]",
        text: "text-[hsl(var(--info))]",
        border: "border-[hsl(var(--info-border))]",
        hover: "hover:bg-[hsl(var(--info-bg-hover))]",
        full: "bg-[hsl(var(--info-bg))] text-[hsl(var(--info))] border-[hsl(var(--info-border))]",
      },
      pending: {
        bg: "bg-[hsl(var(--pending-bg))]",
        text: "text-[hsl(var(--pending))]",
        border: "border-[hsl(var(--pending-border))]",
        hover: "hover:bg-[hsl(var(--pending-bg-hover))]",
        full: "bg-[hsl(var(--pending-bg))] text-[hsl(var(--pending))] border-[hsl(var(--pending-border))]",
      },
    },

    // ============================================
    // User Status Colors
    // ============================================
    userStatus: {
      active: {
        bg: "bg-[hsl(var(--success-bg))]",
        text: "text-[hsl(var(--success))]",
        full: "bg-[hsl(var(--success-bg))] text-[hsl(var(--success))]",
      },
      inactive: {
        bg: "bg-[hsl(var(--error-bg))]",
        text: "text-[hsl(var(--error))]",
        full: "bg-[hsl(var(--error-bg))] text-[hsl(var(--error))]",
      },
    },

    // ============================================
    // Primary Brand Colors
    // ============================================
    primary: {
      whatsapp: "bg-[hsl(var(--whatsapp-green-bg))] text-[hsl(var(--whatsapp-green))] border-[hsl(var(--whatsapp-green))]/20",
      whatsappHover: "hover:bg-[hsl(var(--whatsapp-green-hover))]",
      blue: "bg-[hsl(var(--blue-bg))] text-[hsl(var(--blue))] border-[hsl(var(--blue))]/20",
    },

    // ============================================
    // Table Colors
    // ============================================
    table: {
      bg: "bg-[hsl(var(--table-bg))]",
      bgHover: "hover:bg-[hsl(var(--table-bg-hover))]",
      border: "border-[hsl(var(--table-border))]",
      headerBg: "bg-[hsl(var(--table-header-bg))]",
      headerText: "text-[hsl(var(--table-header-text))]",
    },

    // ============================================
    // Widget/Stats Colors
    // ============================================
    widget: {
      bg: "bg-[hsl(var(--widget-bg))]",
      border: "border-[hsl(var(--widget-border))]",
      shadow: "shadow-[0_4px_6px_hsl(var(--widget-shadow))]",
      hoverShadow: "hover:shadow-[0_8px_12px_hsl(var(--widget-hover-shadow))]",
    },

    // ============================================
    // Icon Colors
    // ============================================
    icon: {
      primary: "text-[hsl(var(--icon-primary))]",
      secondary: "text-[hsl(var(--icon-secondary))]",
      muted: "text-[hsl(var(--icon-muted))]",
      hover: "hover:text-[hsl(var(--icon-hover))]",
    },

    // ============================================
    // Sidebar Colors
    // ============================================
    sidebar: {
      bg: "bg-[hsl(var(--sidebar-bg))]",
      border: "border-[hsl(var(--sidebar-border))]",
      itemHover: "hover:bg-[hsl(var(--sidebar-item-hover))]",
      itemActive: "bg-[hsl(var(--sidebar-item-active-bg))] text-[hsl(var(--sidebar-item-active-text))]",
      itemActiveText: "text-[hsl(var(--sidebar-item-active-text))]",
    },

    // ============================================
    // Toast Colors
    // ============================================
    toast: {
      success: {
        bg: "bg-[hsl(var(--toast-success-bg))]",
        text: "text-[hsl(var(--toast-success-text))]",
        border: "border-[hsl(var(--toast-success-border))]",
      },
      error: {
        bg: "bg-[hsl(var(--toast-error-bg))]",
        text: "text-[hsl(var(--toast-error-text))]",
        border: "border-[hsl(var(--toast-error-border))]",
      },
      info: {
        bg: "bg-[hsl(var(--toast-info-bg))]",
        text: "text-[hsl(var(--toast-info-text))]",
        border: "border-[hsl(var(--toast-info-border))]",
      },
      warning: {
        bg: "bg-[hsl(var(--toast-warning-bg))]",
        text: "text-[hsl(var(--toast-warning-text))]",
        border: "border-[hsl(var(--toast-warning-border))]",
      },
    },

    // ============================================
    // Loader Colors
    // ============================================
    loader: {
      primary: "text-[hsl(var(--loader-primary))]",
      secondary: "text-[hsl(var(--loader-secondary))]",
      bg: "bg-[hsl(var(--loader-bg))]",
    },
  },

  // ============================================
  // Status Badge Configurations
  // ============================================
  statusBadges: {
    session: {
      pending: {
        label: "قيد الانتظار",
        className: "bg-[hsl(var(--warning-bg))] text-[hsl(var(--warning))] border-[hsl(var(--warning-border))]",
      },
      active: {
        label: "نشط",
        className: "bg-[hsl(var(--success-bg))] text-[hsl(var(--success))] border-[hsl(var(--success-border))]",
      },
      terminated: {
        label: "منتهي",
        className: "bg-[hsl(var(--pending-bg))] text-[hsl(var(--pending))] border-[hsl(var(--pending-border))]",
      },
    },
    message: {
      sent: {
        label: "تم الإرسال",
        className: "bg-[hsl(var(--success-bg))] text-[hsl(var(--success))] border-[hsl(var(--success-border))]",
      },
      failed: {
        label: "فشل الإرسال",
        className: "bg-[hsl(var(--error-bg))] text-[hsl(var(--error))] border-[hsl(var(--error-border))]",
      },
    },
    campaign: {
      pending: {
        label: "في الانتظار",
        className: "bg-[hsl(var(--pending-bg))] text-[hsl(var(--pending))]",
      },
      processing: {
        label: "قيد المعالجة",
        className: "bg-[hsl(var(--info-bg))] text-[hsl(var(--info))]",
      },
      completed: {
        label: "مكتملة",
        className: "bg-[hsl(var(--success-bg))] text-[hsl(var(--success))]",
      },
      failed: {
        label: "فاشلة",
        className: "bg-[hsl(var(--error-bg))] text-[hsl(var(--error))]",
      },
      cancelled: {
        label: "ملغاة",
        className: "bg-[hsl(var(--warning-bg))] text-[hsl(var(--warning))]",
      },
    },
  },
} as const;

export type ThemeConfig = typeof themeConfig;
