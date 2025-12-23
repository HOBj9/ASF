"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import { useRouter } from "next/navigation"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })

    // You can log to an error reporting service here
    // Example: logErrorToService(error, errorInfo)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />
    }

    return this.props.children
  }
}

interface ErrorFallbackProps {
  error: Error | null
  onReset: () => void
}

function ErrorFallback({ error, onReset }: ErrorFallbackProps) {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-2xl w-full text-right">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <CardTitle>حدث خطأ غير متوقع</CardTitle>
          </div>
          <CardDescription>
            نعتذر، حدث خطأ أثناء تحميل الصفحة. يرجى المحاولة مرة أخرى.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && error && (
            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="text-sm font-mono text-destructive break-all">
                {error.toString()}
              </p>
              {error.stack && (
                <details className="mt-2">
                  <summary className="text-sm cursor-pointer text-muted-foreground">
                    تفاصيل الخطأ
                  </summary>
                  <pre className="mt-2 text-xs overflow-auto max-h-60 p-2 bg-muted rounded">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}

          <div className="flex gap-2 flex-row-reverse">
            <Button onClick={onReset} variant="default">
              <RefreshCw className="ml-2 h-4 w-4" />
              إعادة المحاولة
            </Button>
            <Button onClick={() => router.push('/dashboard')} variant="outline">
              <Home className="ml-2 h-4 w-4" />
              العودة للوحة التحكم
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

