'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

export type MultiSelectOption = {
  _id: string;
  name: string;
};

export type MultiSelectWithSearchProps = {
  options: MultiSelectOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  emptyMessage?: string;
  className?: string;
};

export function MultiSelectWithSearch({
  options,
  value,
  onChange,
  placeholder = 'اختر...',
  label,
  disabled = false,
  emptyMessage = 'لا توجد عناصر',
  className,
}: MultiSelectWithSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.trim().toLowerCase();
    return options.filter(
      (opt) =>
        opt.name.toLowerCase().includes(q) ||
        opt._id.toLowerCase().includes(q)
    );
  }, [options, searchQuery]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const selectAllFiltered = () => {
    const filteredIds = filteredOptions.map((o) => o._id);
    const allSelected = filteredIds.every((id) => value.includes(id));
    if (allSelected) {
      onChange(value.filter((id) => !filteredIds.includes(id)));
    } else {
      const merged = new Set([...value, ...filteredIds]);
      onChange(Array.from(merged));
    }
  };

  const selectedOptions = options.filter((o) => value.includes(o._id));
  const summaryText =
    selectedOptions.length === 0
      ? placeholder
      : selectedOptions.length === 1
        ? selectedOptions[0].name
        : `${selectedOptions.length} عناصر محددة`;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {label && (
        <label className="mb-1 block text-sm text-foreground">{label}</label>
      )}
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-right ring-offset-background',
          'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          open && 'ring-2 ring-ring ring-offset-2'
        )}
      >
        <span className={cn('flex-1 truncate', !value.length && 'text-muted-foreground')}>
          {summaryText}
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 opacity-50 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          className="absolute top-full z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
          dir="rtl"
        >
          <div className="border-b p-2">
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث..."
              className="h-9"
              autoFocus
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="w-full rounded px-2 py-1.5 text-right text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  {filteredOptions.every((o) => value.includes(o._id))
                    ? 'إلغاء تحديد الكل'
                    : 'تحديد الكل'}
                </button>
                {filteredOptions.map((opt) => (
                  <label
                    key={opt._id}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm hover:bg-accent hover:text-accent-foreground',
                      value.includes(opt._id) && 'bg-accent/50'
                    )}
                  >
                    <Checkbox
                      checked={value.includes(opt._id)}
                      onCheckedChange={() => toggle(opt._id)}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="flex-shrink-0"
                    />
                    <span className="flex-1 truncate text-right">{opt.name}</span>
                  </label>
                ))}
              </>
            ) : (
              <div className="py-4 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
