"use client"

import * as React from "react"
import { Button, ButtonProps } from "@/components/ui/button"
import { getMessage } from "@/constants/messages"
import { 
  Save, X, Trash2, Edit, Plus, Check, 
  Search, Filter, RefreshCw, Upload, Download,
  Send
} from "lucide-react"
import { CircularSpinner } from "@/components/ui/loading"
import { cn } from "@/lib/utils"

type ActionType = 
  | 'save' | 'cancel' | 'delete' | 'edit' | 'create' | 'confirm' 
  | 'update' | 'close' | 'search' | 'filter' | 'refresh'
  | 'export' | 'import' | 'selectAll' | 'deselectAll'
  | 'deleteSelected' | 'createCampaign' | 'createContact'
  | 'createSession' | 'sendMessage' | 'bulkSend' | 'importExcel'
  | 'terminate' | 'restart' | 'addToContacts'

interface ActionButtonProps extends Omit<ButtonProps, 'children'> {
  action: ActionType
  loading?: boolean
  count?: number
  customLabel?: string
  icon?: React.ComponentType<{ className?: string }>
  iconPosition?: 'left' | 'right'
  showIcon?: boolean
}

const actionIcons: Record<ActionType, React.ComponentType<{ className?: string }>> = {
  save: Save,
  cancel: X,
  delete: Trash2,
  edit: Edit,
  create: Plus,
  confirm: Check,
  update: Save,
  close: X,
  search: Search,
  filter: Filter,
  refresh: RefreshCw,
  export: Download,
  import: Upload,
  selectAll: Check,
  deselectAll: X,
  deleteSelected: Trash2,
  createCampaign: Send,
  createContact: Plus,
  createSession: Plus,
  sendMessage: Send,
  bulkSend: Send,
  importExcel: Upload,
  terminate: X,
  restart: RefreshCw,
  addToContacts: Plus,
}

const actionVariants: Record<ActionType, ButtonProps['variant']> = {
  save: 'default',
  cancel: 'outline',
  delete: 'destructive',
  edit: 'outline',
  create: 'default',
  confirm: 'default',
  update: 'default',
  close: 'outline',
  search: 'outline',
  filter: 'outline',
  refresh: 'outline',
  export: 'outline',
  import: 'outline',
  selectAll: 'outline',
  deselectAll: 'outline',
  deleteSelected: 'destructive',
  createCampaign: 'default',
  createContact: 'default',
  createSession: 'default',
  sendMessage: 'default',
  bulkSend: 'default',
  importExcel: 'outline',
  terminate: 'destructive',
  restart: 'outline',
  addToContacts: 'default',
}

export const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ 
    action, 
    loading = false, 
    count, 
    customLabel,
    icon: CustomIcon,
    iconPosition = 'right',
    showIcon = true,
    variant,
    className,
    disabled,
    ...props 
  }, ref) => {
    const Icon = CustomIcon || actionIcons[action]
    const defaultVariant = actionVariants[action]
    const messageKey = `buttons.${action}`
    const label = customLabel || getMessage(messageKey, count ? { count } : undefined)
    
    const isLoading = loading || disabled
    
    // For RTL: iconPosition='right' means icon should appear after text (visually on left in RTL)
    // With flex-row-reverse, we put icon first in DOM to appear after text visually
    return (
      <Button
        ref={ref}
        variant={variant || defaultVariant}
        disabled={isLoading}
        className={cn("gap-2 flex-row-reverse", className)}
        {...props}
      >
        {isLoading ? (
          <>
            <CircularSpinner size="xs" />
            {getMessage('buttons.loading')}
          </>
        ) : (
          <>
            {/* In RTL with flex-row-reverse, icon first = appears after text visually */}
            {showIcon && Icon && iconPosition === 'right' && (
              <Icon className="h-4 w-4" />
            )}
            <span>{label}</span>
            {count !== undefined && (
              <span className="px-2 py-0.5 bg-background/20 rounded-full text-xs font-semibold">
                {count}
              </span>
            )}
            {/* In RTL with flex-row-reverse, icon last = appears before text visually */}
            {showIcon && Icon && iconPosition === 'left' && (
              <Icon className="h-4 w-4" />
            )}
          </>
        )}
      </Button>
    )
  }
)

ActionButton.displayName = "ActionButton"

