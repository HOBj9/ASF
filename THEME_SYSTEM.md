# نظام الألوان الموحد - Unified Theme System

## نظرة عامة

تم إنشاء نظام شامل لتوحيد جميع الألوان في التطبيق باستخدام CSS Variables. جميع الألوان الآن موحدة في مكان واحد ويمكن تغييرها بسهولة.

## الملفات الرئيسية

### 1. `src/app/globals.css`
يحتوي على جميع متغيرات CSS للألوان في الوضعين Light و Dark.

### 2. `src/lib/config/theme.config.ts`
يحتوي على تكوينات الألوان كـ Tailwind classes جاهزة للاستخدام.

### 3. `src/lib/utils/theme-helpers.ts`
وظائف مساعدة للوصول السهل للألوان.

## كيفية الاستخدام

### 1. استخدام CSS Variables مباشرة

```tsx
// في className
<div className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
  Content
</div>
```

### 2. استخدام theme.config.ts

```tsx
import { themeConfig } from "@/lib/config/theme.config";

// Status colors
<div className={themeConfig.colors.status.success.full}>
  Success message
</div>

// Table colors
<tr className={`${themeConfig.colors.table.bg} ${themeConfig.colors.table.bgHover}`}>
  Table row
</tr>

// Icon colors
<Icon className={themeConfig.colors.icon.primary} />

// Sidebar colors
<button className={themeConfig.colors.sidebar.itemActive}>
  Active item
</button>
```

### 3. استخدام Theme Helpers

```tsx
import { getStatusColor, getIconColors } from "@/lib/utils/theme-helpers";

// Get status colors
const successColors = getStatusColor('success');
<div className={successColors.full}>Success</div>

// Get icon colors
const iconColors = getIconColors();
<Icon className={iconColors.primary} />
```

## المتغيرات المتاحة

### الألوان الأساسية
- `--primary` - اللون الأساسي
- `--primary-foreground` - لون النص على الخلفية الأساسية
- `--primary-hover` - لون hover
- `--primary-bg` - خلفية فاتحة
- `--secondary`, `--muted`, `--accent` - ألوان ثانوية

### ألوان الحالة (Status)
- `--success` - الأخضر للنجاح
- `--error` - الأحمر للأخطاء
- `--warning` - الأصفر للتحذيرات
- `--info` - الأزرق للمعلومات
- `--pending` - الرمادي للانتظار

كل لون يحتوي على:
- `--{color}` - اللون الأساسي
- `--{color}-bg` - خلفية فاتحة
- `--{color}-bg-hover` - خلفية عند hover
- `--{color}-border` - لون الحدود

### ألوان الجداول
- `--table-bg` - خلفية الجدول
- `--table-bg-hover` - خلفية عند hover
- `--table-border` - حدود الجدول
- `--table-header-bg` - خلفية رأس الجدول
- `--table-header-text` - نص رأس الجدول

### ألوان الـ Widgets/Stats
- `--widget-bg` - خلفية الـ widget
- `--widget-border` - حدود الـ widget
- `--widget-shadow` - ظل الـ widget
- `--widget-hover-shadow` - ظل عند hover

### ألوان الأيقونات
- `--icon-primary` - لون الأيقونة الأساسي
- `--icon-secondary` - لون ثانوي
- `--icon-muted` - لون خافت
- `--icon-hover` - لون عند hover

### ألوان الـ Sidebar
- `--sidebar-bg` - خلفية الـ sidebar
- `--sidebar-border` - حدود الـ sidebar
- `--sidebar-item-hover` - خلفية عند hover
- `--sidebar-item-active` - لون العنصر النشط
- `--sidebar-item-active-text` - نص العنصر النشط
- `--sidebar-item-active-bg` - خلفية العنصر النشط

### ألوان الـ Toast
- `--toast-success-bg`, `--toast-success-text`, `--toast-success-border`
- `--toast-error-bg`, `--toast-error-text`, `--toast-error-border`
- `--toast-info-bg`, `--toast-info-text`, `--toast-info-border`
- `--toast-warning-bg`, `--toast-warning-text`, `--toast-warning-border`

### ألوان الـ Loader
- `--loader-primary` - اللون الأساسي
- `--loader-secondary` - اللون الثانوي
- `--loader-bg` - خلفية الـ loader

## تغيير الألوان

للتغيير، عدل القيم في `globals.css`:

```css
:root {
  --primary: 168 100% 33%; /* WhatsApp Green */
  /* غير هذه القيمة لتغيير اللون الأساسي */
}

.dark {
  --primary: 168 100% 40%; /* WhatsApp Green (lighter for dark mode) */
}
```

## أمثلة الاستخدام

### Status Badge
```tsx
import { getStatusBadge } from "@/lib/utils/theme-helpers";

const badge = getStatusBadge('session', 'active');
<span className={badge.className}>{badge.label}</span>
```

### Table Row
```tsx
import { getTableColors } from "@/lib/utils/theme-helpers";

const tableColors = getTableColors();
<tr className={`${tableColors.bg} ${tableColors.bgHover} ${tableColors.border}`}>
  ...
</tr>
```

### Widget Card
```tsx
import { getWidgetColors } from "@/lib/utils/theme-helpers";

const widgetColors = getWidgetColors();
<Card className={`${widgetColors.bg} ${widgetColors.border} ${widgetColors.shadow} ${widgetColors.hoverShadow}`}>
  ...
</Card>
```

### Icon with Hover
```tsx
import { getIconColors } from "@/lib/utils/theme-helpers";

const iconColors = getIconColors();
<Icon className={`${iconColors.primary} ${iconColors.hover}`} />
```

## ملاحظات مهمة

1. **جميع الألوان تستخدم CSS Variables** - لا تستخدم ألوان hardcoded
2. **دعم Dark Mode** - جميع الألوان لها قيم للوضعين Light و Dark
3. **Hover States** - جميع العناصر التفاعلية لها ألوان hover
4. **Consistency** - استخدم نفس الألوان لنفس الأغراض في كل مكان

## التحديثات المستقبلية

لإضافة لون جديد:
1. أضف المتغير في `globals.css` للوضعين Light و Dark
2. أضف التكوين في `theme.config.ts`
3. أضف helper function في `theme-helpers.ts` إذا لزم الأمر

