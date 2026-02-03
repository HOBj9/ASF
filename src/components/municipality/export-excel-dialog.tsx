"use client"

import { useMemo, useState } from "react"
import * as XLSX from "xlsx"
import toast from "react-hot-toast"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export type ExportColumn<T> = {
  key: string
  label: string
  value: (row: T) => unknown
  defaultSelected?: boolean
}

type ExportExcelDialogProps<T> = {
  title: string
  rows: T[]
  columns: ExportColumn<T>[]
  fileBaseName: string
  buttonLabel?: string
}

export function ExportExcelDialog<T>({
  title,
  rows,
  columns,
  fileBaseName,
  buttonLabel = "تصدير Excel",
}: ExportExcelDialogProps<T>) {
  const [open, setOpen] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<string[]>(
    columns.filter((c) => c.defaultSelected !== false).map((c) => c.key)
  )

  const selectedColumns = useMemo(
    () => columns.filter((c) => selectedKeys.includes(c.key)),
    [columns, selectedKeys]
  )

  const toggleColumn = (key: string, checked: boolean) => {
    setSelectedKeys((prev) => {
      if (checked) {
        return prev.includes(key) ? prev : [...prev, key]
      }
      if (prev.length <= 1) return prev
      return prev.filter((k) => k !== key)
    })
  }

  const exportFile = () => {
    if (!rows.length) {
      toast.error("لا توجد بيانات للتصدير")
      return
    }
    if (!selectedColumns.length) {
      toast.error("يرجى اختيار عمود واحد على الأقل")
      return
    }

    const sheetRows = rows.map((row) => {
      const out: Record<string, unknown> = {}
      selectedColumns.forEach((col) => {
        out[col.label] = col.value(row)
      })
      return out
    })

    const worksheet = XLSX.utils.json_to_sheet(sheetRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data")
    const stamp = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(workbook, `${fileBaseName}-${stamp}.xlsx`)
    setOpen(false)
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <Download className="h-4 w-4" />
        {buttonLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="text-right">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
            {columns.map((column) => {
              const checked = selectedKeys.includes(column.key)
              return (
                <label
                  key={column.key}
                  className="flex items-center justify-between rounded-lg border p-2 cursor-pointer"
                >
                  <span>{column.label}</span>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`col-${column.key}`} className="text-xs text-muted-foreground">
                      تضمين
                    </Label>
                    <Checkbox
                      id={`col-${column.key}`}
                      checked={checked}
                      onCheckedChange={(value) => toggleColumn(column.key, Boolean(value))}
                    />
                  </div>
                </label>
              )
            })}
          </div>

          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={exportFile}>تصدير الملف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

