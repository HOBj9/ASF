"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { getMessage } from "@/constants/messages"
import { TableSkeleton } from "./skeleton"
import { Card, CardContent } from "./card"

interface Column<T> {
  id: string
  header: string | React.ReactNode
  accessor: ((row: T) => React.ReactNode) | string
  cell?: (row: T) => React.ReactNode
  className?: string
  headerClassName?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  emptyMessage?: string | React.ReactNode
  emptyIcon?: React.ReactNode
  className?: string
  rowClassName?: (row: T, index: number) => string
  onRowClick?: (row: T) => void
  stickyHeader?: boolean
  alternatingRowColors?: boolean
  wrapper?: 'card' | 'div' | 'none'
}

export function DataTable<T extends { _id?: string; id?: string }>({
  data,
  columns,
  loading = false,
  emptyMessage,
  emptyIcon,
  className,
  rowClassName,
  onRowClick,
  stickyHeader = false,
  alternatingRowColors = false,
  wrapper = 'div',
}: DataTableProps<T>) {
  const getRowKey = (row: T, index: number) => {
    return row._id || row.id || `row-${index}`
  }

  const renderEmptyState = () => {
    if (emptyIcon || emptyMessage) {
      return (
        <div className="text-right py-12" dir="rtl">
          {emptyIcon && <div className="mb-4 flex justify-center">{emptyIcon}</div>}
          <p className="text-muted-foreground">
            {emptyMessage || getMessage('tables.noData')}
          </p>
        </div>
      )
    }
    return (
      <div className="text-right py-12" dir="rtl">
        <p className="text-muted-foreground">
          {getMessage('tables.noData')}
        </p>
      </div>
    )
  }

  const renderTable = () => {
    if (loading) {
      return <TableSkeleton rows={5} columns={columns.length} className={className} />
    }

    if (data.length === 0) {
      return renderEmptyState()
    }

    return (
      <div className="overflow-x-auto" dir="rtl">
        <table className="w-full" dir="rtl">
          <thead className={cn(
            "border-b bg-muted/50",
            stickyHeader && "sticky top-0 z-10 bg-muted/50 backdrop-blur-sm"
          )}>
            <tr>
              {columns.slice().reverse().map((column) => (
                <th
                  key={column.id}
                  className={cn(
                    "h-12 px-4 text-right font-medium text-muted-foreground",
                    column.className,
                    column.headerClassName
                  )}
                  dir="rtl"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody dir="rtl">
            {data.map((row, index) => (
              <tr
                key={getRowKey(row, index)}
                className={cn(
                  "border-b transition-colors",
                  onRowClick && "cursor-pointer hover:bg-muted/50",
                  alternatingRowColors && (index % 2 === 0 ? "bg-background" : "bg-muted/20"),
                  !alternatingRowColors && !onRowClick && "hover:bg-muted/50",
                  rowClassName?.(row, index)
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.slice().reverse().map((column) => {
                  const getCellContent = () => {
                    // If cell function is provided, use it
                    if (column.cell) {
                      return column.cell(row)
                    }
                    // If accessor is a function, call it
                    if (typeof column.accessor === 'function') {
                      return column.accessor(row)
                    }
                    // If accessor is a string, access the property directly
                    if (typeof column.accessor === 'string') {
                      return (row as any)[column.accessor] ?? ''
                    }
                    return null
                  }
                  
                  return (
                    <td
                      key={column.id}
                      className={cn("p-4 text-right", column.className)}
                      dir="rtl"
                    >
                      {getCellContent()}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const tableContent = (
    <div className={cn(
      wrapper === 'none' ? "" : "rounded-md border",
      className
    )}>
      {renderTable()}
    </div>
  )

  if (wrapper === 'card') {
    return (
      <Card className="text-right">
        <CardContent className="p-0">
          {tableContent}
        </CardContent>
      </Card>
    )
  }

  return tableContent
}
