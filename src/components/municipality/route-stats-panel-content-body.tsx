"use client";

import dynamic from "next/dynamic";
import { ExportExcelDialog } from "@/components/municipality/export-excel-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loading } from "@/components/ui/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye } from "lucide-react";
import type { RouteStatsPanelContentProps } from "./route-stats-panel-content";

const RouteVisitsMap = dynamic(
  () => import("./route-visits-map").then((m) => m.RouteVisitsMap),
  { ssr: false },
);

const TEXT = {
  routeStatsTitle: "\u0625\u062d\u0635\u0627\u0626\u064a\u0627\u062a \u0627\u0644\u0645\u0633\u0627\u0631",
  fromDate: "\u0645\u0646 \u062a\u0627\u0631\u064a\u062e",
  toDate: "\u0625\u0644\u0649 \u062a\u0627\u0631\u064a\u062e",
  vehicle: "\u0627\u0644\u0645\u0631\u0643\u0628\u0629",
  noLinkedVehicles: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0631\u0643\u0628\u0627\u062a \u0645\u0631\u0628\u0648\u0637\u0629",
  allVehicles: "\u0643\u0644 \u0627\u0644\u0645\u0631\u0643\u0628\u0627\u062a",
  noVehiclesHint:
    "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0631\u0643\u0628\u0627\u062a \u0645\u0631\u0628\u0648\u0637\u0629 \u0628\u0647\u0630\u0627 \u0627\u0644\u0645\u0633\u0627\u0631. \u0631\u0628\u0637 \u0627\u0644\u0645\u0631\u0643\u0628\u0627\u062a \u0645\u0646 \u062c\u062f\u0648\u0644 \u0627\u0644\u0645\u0633\u0627\u0631.",
  show: "\u0639\u0631\u0636",
  loadingStats: "\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0625\u062d\u0635\u0627\u0626\u064a\u0627\u062a...",
  workDaysLog: "\u0633\u062c\u0644 \u0623\u064a\u0627\u0645 \u0627\u0644\u0639\u0645\u0644",
  completionRate: "\u0646\u0633\u0628\u0629 \u0627\u0644\u0625\u062a\u0645\u0627\u0645",
  exportVisitsLog: "\u062a\u0635\u062f\u064a\u0631 \u0633\u062c\u0644 \u0627\u0644\u0632\u064a\u0627\u0631\u0627\u062a",
  exportExcel: "\u062a\u0635\u062f\u064a\u0631 Excel",
  noWorkDays: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0623\u064a\u0627\u0645 \u0639\u0645\u0644 \u0641\u064a \u0627\u0644\u0641\u062a\u0631\u0629 \u0627\u0644\u0645\u062d\u062f\u062f\u0629.",
  date: "\u0627\u0644\u062a\u0627\u0631\u064a\u062e",
  day: "\u0627\u0644\u064a\u0648\u0645",
  visitedPoints: "\u0627\u0644\u0646\u0642\u0627\u0637 \u0627\u0644\u0645\u0632\u0627\u0631\u0629",
  completion: "\u0646\u0633\u0628\u0629 \u0627\u0644\u0625\u0646\u062c\u0627\u0632",
  actions: "\u0627\u0644\u0625\u062c\u0631\u0627\u0621\u0627\u062a",
  today: "\u0627\u0644\u064a\u0648\u0645",
  viewDetails: "\u0639\u0631\u0636 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644",
  dayWorkDetails: "\u062a\u0641\u0627\u0635\u064a\u0644 \u064a\u0648\u0645 \u0627\u0644\u0639\u0645\u0644",
  loadingDetails: "\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644...",
  visitReport: "\u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u0632\u064a\u0627\u0631\u0629",
  noVisits: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0632\u064a\u0627\u0631\u0627\u062a \u0645\u0633\u062c\u0644\u0629.",
  entryTime: "\u0648\u0642\u062a \u0627\u0644\u062f\u062e\u0648\u0644",
  exitTime: "\u0648\u0642\u062a \u0627\u0644\u062e\u0631\u0648\u062c",
  duration: "\u0627\u0644\u0645\u062f\u0629",
  orderAnalysis: "\u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u062a\u0631\u062a\u064a\u0628",
  visitInOrder:
    "\u0627\u0644\u0632\u064a\u0627\u0631\u0629 \u062a\u0645\u062a \u0628\u0627\u0644\u062a\u0631\u062a\u064a\u0628 \u0627\u0644\u0635\u062d\u064a\u062d",
  randomVisitPrefix:
    "\u0639\u0634\u0648\u0627\u0626\u064a\u0629 \u2013 \u0627\u0644\u0646\u0642\u0627\u0637 \u0627\u0644\u0634\u0627\u0630\u0629:",
  pointsMap: "\u062e\u0631\u064a\u0637\u0629 \u0627\u0644\u0646\u0642\u0627\u0637",
  point: "\u0646\u0642\u0637\u0629",
  previous: "\u0627\u0644\u0633\u0627\u0628\u0642",
  next: "\u0627\u0644\u062a\u0627\u0644\u064a",
  secondsSuffix: "\u062b",
  dash: "\u2014",
} as const;

export function RouteStatsPanelContentBody(props: RouteStatsPanelContentProps) {
  const {
    loadingStats,
    stats,
    completionRate,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    vehicleId,
    setVehicleId,
    vehicles,
    loadStats,
    exportColumns,
    routeName,
    todayDateStr,
    openDetailModal,
    detailDateStr,
    closeDetailModal,
    loadingDayDetail,
    dayDetail,
    orderAnalysis,
    mapPoints,
    visitedPointIds,
    routeColor,
    labels,
    totalPages,
    page,
    setPage,
  } = props;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{TEXT.routeStatsTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>{TEXT.fromDate}</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>{TEXT.toDate}</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>{labels.vehicleLabel || TEXT.vehicle}</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger className="mt-1">
                  <SelectValue
                    placeholder={
                      vehicles.length === 0
                        ? TEXT.noLinkedVehicles
                        : TEXT.allVehicles
                    }
                  />
                </SelectTrigger>
                <SelectContent className="z-[100]" position="popper">
                  <SelectItem value="all">{TEXT.allVehicles}</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v._id} value={v._id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {vehicles.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {TEXT.noVehiclesHint}
                </p>
              )}
            </div>
            <div className="flex items-end">
              <Button onClick={loadStats} disabled={loadingStats}>
                {TEXT.show}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loadingStats && (
        <div className="flex justify-center py-8">
          <Loading text={TEXT.loadingStats} className="min-h-0" />
        </div>
      )}

      {!loadingStats && stats && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{TEXT.workDaysLog}</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {TEXT.completionRate}: {completionRate}%
              </span>
              <ExportExcelDialog
                title={TEXT.exportVisitsLog}
                rows={stats.workDays}
                columns={exportColumns}
                fileBaseName={`route-stats-${routeName}`}
                buttonLabel={TEXT.exportExcel}
              />
            </div>
          </CardHeader>
          <CardContent>
            {stats.workDays.length === 0 ? (
              <p className="py-4 text-muted-foreground">{TEXT.noWorkDays}</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-2 py-2 text-right">{TEXT.date}</th>
                        <th className="px-2 py-2 text-right">{TEXT.day}</th>
                        <th className="px-2 py-2 text-right">{TEXT.visitedPoints}</th>
                        <th className="px-2 py-2 text-right">{TEXT.completion}</th>
                        <th className="px-2 py-2 text-right">{TEXT.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.workDays.map((wd) => (
                        <tr
                          key={wd.dateStr}
                          className={`border-b ${
                            wd.dateStr === todayDateStr
                              ? "bg-primary/15 ring-1 ring-primary/40"
                              : ""
                          }`}
                        >
                          <td className="px-2 py-2">
                            <span className="inline-flex items-center gap-1.5">
                              {wd.dateStr}
                              {wd.dateStr === todayDateStr && (
                                <span className="rounded bg-primary/20 px-1.5 py-0.5 text-xs font-medium text-primary">
                                  {TEXT.today}
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-2 py-2">{wd.dayNameAr}</td>
                          <td className="px-2 py-2">
                            {wd.visitedCount} / {wd.totalCount}
                          </td>
                          <td className="px-2 py-2">
                            <span
                              className={
                                wd.completionRate === 100
                                  ? "font-medium text-green-600"
                                  : wd.completionRate >= 50
                                    ? "text-amber-600"
                                    : "text-red-600"
                              }
                            >
                              {wd.completionRate}%
                            </span>
                          </td>
                          <td className="px-2 py-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => openDetailModal(wd.dateStr)}
                            >
                              <Eye className="h-4 w-4" />
                              {TEXT.viewDetails}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Dialog
                  open={detailDateStr !== null}
                  onOpenChange={(open) => !open && closeDetailModal()}
                >
                  <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {TEXT.dayWorkDetails} {TEXT.dash} {detailDateStr ?? ""}
                      </DialogTitle>
                    </DialogHeader>
                    {loadingDayDetail ? (
                      <Loading text={TEXT.loadingDetails} className="min-h-0" />
                    ) : (
                      <div className="space-y-4">
                        {dayDetail && (
                          <>
                            <div>
                              <h4 className="mb-2 font-medium">{TEXT.visitReport}</h4>
                              {dayDetail.visits.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  {TEXT.noVisits}
                                </p>
                              ) : (
                                <div className="max-h-48 overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b">
                                        <th className="px-2 py-1 text-right">
                                          {TEXT.entryTime}
                                        </th>
                                        <th className="px-2 py-1 text-right">
                                          {TEXT.exitTime}
                                        </th>
                                        <th className="px-2 py-1 text-right">
                                          {TEXT.duration}
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {dayDetail.visits.map((v) => (
                                        <tr key={v._id} className="border-b">
                                          <td className="px-2 py-1">
                                            {new Date(v.entryTime).toLocaleString("ar-SY")}
                                          </td>
                                          <td className="px-2 py-1">
                                            {v.exitTime
                                              ? new Date(v.exitTime).toLocaleString("ar-SY")
                                              : TEXT.dash}
                                          </td>
                                          <td className="px-2 py-1">
                                            {v.durationSeconds != null
                                              ? `${v.durationSeconds} ${TEXT.secondsSuffix}`
                                              : TEXT.dash}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>

                            {orderAnalysis && (
                              <div>
                                <h4 className="mb-2 font-medium">{TEXT.orderAnalysis}</h4>
                                <p
                                  className={
                                    orderAnalysis.inOrder
                                      ? "text-green-600"
                                      : "text-amber-600"
                                  }
                                >
                                  {orderAnalysis.inOrder
                                    ? TEXT.visitInOrder
                                    : `${TEXT.randomVisitPrefix} ${orderAnalysis.outOfOrderPoints.join(", ")}`}
                                </p>
                              </div>
                            )}

                            <div>
                              <h4 className="mb-2 font-medium">{TEXT.pointsMap}</h4>
                              <RouteVisitsMap
                                points={mapPoints}
                                visitedPointIds={visitedPointIds}
                                orderAnalysis={orderAnalysis}
                                routeColor={routeColor || stats.route?.color || "#16a34a"}
                                pointLabel={labels.pointLabel || TEXT.point}
                                pathGeometry={stats.route?.path ?? undefined}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </>
            )}

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {TEXT.previous}
                </Button>
                <span className="text-sm">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  {TEXT.next}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
