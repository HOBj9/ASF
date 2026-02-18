"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loading } from "@/components/ui/loading";
import { apiClient } from "@/lib/api/client";

type WebhookLog = {
  _id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  receivedAt: string;
  createdAt: string;
};

export function WebhookLogsTable() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;
  const [detailLog, setDetailLog] = useState<WebhookLog | null>(null);

  const fetchLogs = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res: any = await apiClient.get(
        `/admin/webhook-logs?page=${p}&limit=${limit}`
      );
      setLogs(res.logs || []);
      setTotal(res.total ?? 0);
      setTotalPages(res.totalPages ?? 1);
    } catch (e) {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(page);
  }, [page, fetchLogs]);

  return (
    <Card className="text-right">
      <CardHeader>
        <CardTitle>سجل طلبات Webhook (أثر)</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          الطلبات الواردة إلى /api/athar/webhook/incoming — الإجمالي: {total}
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loading text="جاري تحميل السجل..." />
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-right">
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">الطريقة</th>
                    <th className="p-3 max-w-[200px] truncate">الرابط</th>
                    <th className="p-3 w-24">الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id} className="border-b">
                      <td className="p-3 text-muted-foreground">
                        {new Date(log.receivedAt || log.createdAt).toLocaleString(
                          "ar-SA"
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={
                            log.method === "POST"
                              ? "text-amber-600"
                              : "text-sky-600"
                          }
                        >
                          {log.method}
                        </span>
                      </td>
                      <td className="p-3 max-w-[200px] truncate" title={log.url}>
                        {log.url}
                      </td>
                      <td className="p-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDetailLog(log)}
                        >
                          تفاصيل
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {logs.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                لا توجد طلبات مسجلة
              </p>
            )}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  صفحة {page} من {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    السابق
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    التالي
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={!!detailLog} onOpenChange={() => setDetailLog(null)}>
        <DialogContent className="text-right max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>تفاصيل الطلب</DialogTitle>
          </DialogHeader>
          {detailLog && (
            <div className="overflow-y-auto space-y-3 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">
                  التاريخ:{" "}
                </span>
                {new Date(detailLog.receivedAt || detailLog.createdAt).toLocaleString(
                  "ar-SA"
                )}
              </div>
              <div>
                <span className="font-medium text-muted-foreground">
                  الطريقة:{" "}
                </span>
                {detailLog.method}
              </div>
              <div>
                <span className="font-medium text-muted-foreground">
                  الرابط:{" "}
                </span>
                <span className="break-all">{detailLog.url}</span>
              </div>
              {Object.keys(detailLog.query || {}).length > 0 && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    Query:
                  </span>
                  <pre className="mt-1 p-3 rounded bg-muted overflow-x-auto text-xs">
                    {JSON.stringify(detailLog.query, null, 2)}
                  </pre>
                </div>
              )}
              {detailLog.body != null && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    Body:
                  </span>
                  <pre className="mt-1 p-3 rounded bg-muted overflow-x-auto text-xs max-h-48 overflow-y-auto">
                    {typeof detailLog.body === "string"
                      ? detailLog.body
                      : JSON.stringify(detailLog.body, null, 2)}
                  </pre>
                </div>
              )}
              {Object.keys(detailLog.headers || {}).length > 0 && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    Headers:
                  </span>
                  <pre className="mt-1 p-3 rounded bg-muted overflow-x-auto text-xs max-h-32 overflow-y-auto">
                    {JSON.stringify(detailLog.headers, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
