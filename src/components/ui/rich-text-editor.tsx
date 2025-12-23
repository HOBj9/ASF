"use client"

import { useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Bold, Italic, Underline, AlignRight, AlignLeft, AlignCenter, Palette } from "lucide-react"
import { Button } from "./button"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value
    }
  }, [value])

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    handleInput()
  }

  const ToolbarButton = ({ onClick, icon: Icon, title }: { onClick: () => void; icon: any; title: string }) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="h-8 w-8"
      title={title}
    >
      <Icon className="h-4 w-4" />
    </Button>
  )

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-muted/50">
        <ToolbarButton onClick={() => execCommand('bold')} icon={Bold} title="عريض" />
        <ToolbarButton onClick={() => execCommand('italic')} icon={Italic} title="مائل" />
        <ToolbarButton onClick={() => execCommand('underline')} icon={Underline} title="تحته خط" />
        <div className="w-px h-6 bg-border mx-1" />
        <ToolbarButton onClick={() => execCommand('justifyRight')} icon={AlignRight} title="محاذاة لليمين" />
        <ToolbarButton onClick={() => execCommand('justifyCenter')} icon={AlignCenter} title="محاذاة للوسط" />
        <ToolbarButton onClick={() => execCommand('justifyLeft')} icon={AlignLeft} title="محاذاة لليسار" />
        <div className="w-px h-6 bg-border mx-1" />
        <input
          type="color"
          onChange={(e) => execCommand('foreColor', e.target.value)}
          className="h-8 w-8 cursor-pointer"
          title="لون النص"
        />
      </div>
      
      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className={cn(
          "min-h-[200px] p-4 text-right focus:outline-none",
          "prose prose-sm max-w-none dark:prose-invert",
          "[&_strong]:font-bold [&_em]:italic [&_u]:underline"
        )}
        style={{ direction: 'rtl' }}
        data-placeholder={placeholder || "أدخل نص الرسالة..."}
        suppressContentEditableWarning
      />
      
      <style jsx>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}

