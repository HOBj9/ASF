/**
 * Format Utilities
 * Date, string, and data formatting functions
 */

/**
 * Format date to Arabic locale
 */
export function formatDate(date: Date | string, locale: string = 'ar-SA'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

/**
 * Format date to relative time (e.g., "منذ ساعتين")
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'الآن';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `منذ ${diffInMinutes} دقيقة`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `منذ ${diffInHours} ساعة`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `منذ ${diffInDays} يوم`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `منذ ${diffInMonths} شهر`;
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  return `منذ ${diffInYears} سنة`;
}

/**
 * Truncate string with ellipsis
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('ar-SA').format(num);
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'SAR'): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Convert HTML to WhatsApp Markdown format
 * Converts HTML tags to WhatsApp formatting:
 * - <b>, <strong> → *text* (bold)
 * - <i>, <em> → _text_ (italic)
 * - <u> → _text_ (underline not supported, use italic)
 * - <s>, <strike> → ~text~ (strikethrough)
 * - <br>, <p>, <div> → \n (line breaks)
 * - <h1>, <h2>, etc. → *text*\n (bold + line break)
 * - &nbsp; → space
 */
export function htmlToWhatsAppMarkdown(html: string): string {
  if (!html) return '';
  
  let text = html;
  
  // First, handle block-level elements that should create line breaks
  // Replace closing tags with newlines before removing tags
  text = text.replace(/<\/(h[1-6]|p|div|li|tr)>/gi, '\n');
  text = text.replace(/<(h[1-6]|p|div|li|tr)[^>]*>/gi, '\n');
  
  // Handle headings - make them bold
  text = text.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '*$1*\n');
  
  // Handle line breaks
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<br\s*>/gi, '\n');
  
  // Handle bold/strong - convert to WhatsApp bold
  text = text.replace(/<(b|strong)[^>]*>(.*?)<\/\1>/gi, '*$2*');
  
  // Handle italic/em - convert to WhatsApp italic
  text = text.replace(/<(i|em)[^>]*>(.*?)<\/\1>/gi, '_$2_');
  
  // Handle underline - WhatsApp doesn't support underline, use italic instead
  text = text.replace(/<u[^>]*>(.*?)<\/u>/gi, '_$1_');
  
  // Handle strikethrough
  text = text.replace(/<(s|strike|del)[^>]*>(.*?)<\/\1>/gi, '~$2~');
  
  // Handle code
  text = text.replace(/<code[^>]*>(.*?)<\/code>/gi, '```$1```');
  
  // Replace HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&apos;/g, "'");
  
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Clean up multiple consecutive newlines (max 2)
  text = text.replace(/\n{3,}/g, '\n\n');
  
  // Clean up spaces around newlines
  text = text.replace(/[ \t]+\n/g, '\n');
  text = text.replace(/\n[ \t]+/g, '\n');
  
  // Trim whitespace
  return text.trim();
}

