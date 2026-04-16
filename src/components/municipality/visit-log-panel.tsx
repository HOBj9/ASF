'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLabels } from '@/hooks/use-labels';
import type { VisitLogRow, VisitLogTab } from '@/app/api/visit-log/preview/route';

type VisitLogPanelProps = {
  isSystemAdmin?: boolean;
  isOrganizationAdmin?: boolean;
  organizationId?: string | null;
  sessionBranchId?: string | null;
};

type OptionItem = { _id: string; name: string };

const TAB_OPTIONS: { value: VisitLogTab; label: string }[] = [
  { value: 'entries', label: 'سجل الدخول' },
  { value: 'exits', label: 'سجل الخروج' },
  { value: 'visits', label: 'سجل الزيارات' },
  { value: 'repeated-entries', label: 'سجل الدخول المتكرر' },
  { value: 'repeated-exits', label: 'سجل الخروج المتكرر' },
  { value: 'repeated-points', label: 'المناطق المكررة الزيارة' },
];

const PAGE_SIZE = 20;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toLocalDateTimeInput(value: Date): string {
  const year = value.getFullYear();
  const month = pad(value.getMonth() + 1);
  const day = pad(value.getDate());
  const hours = pad(value.getHours());
  const minutes = pad(value.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getTodayRange(): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { from: toLocalDateTimeInput(start), to: toLocalDateTimeInput(end) };
}

function formatCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '-';
  const s = String(value).trim();
  return s.length ? s : '-';
}

function formatVisitKind(kind: 'first' | 'repeated' | null | undefined): string {
  if (kind === 'first') return 'أولى';
  if (kind === 'repeated') return 'مكررة';
  return '-';
}

function formatEventTime(iso: string | undefined): string {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString('ar-SY');
  } catch {
    return '-';
  }
}

export function VisitLogPanel({
  isSystemAdmin = false,
  isOrganizationAdmin = false,
  organizationId,
  sessionBranchId,
}: VisitLogPanelProps) {
  const searchParams = useSearchParams();
  const { labels } = useLabels();
  const [activeTab, setActiveTab] = useState<VisitLogTab>('visits');
  const [organizations, setOrganizations] = useState<OptionItem[]>([]);
  const [branches, setBranches] = useState<OptionItem[]>([]);
  const [points, setPoints] = useState<OptionItem[]>([]);
  const [vehicles, setVehicles] = useState<OptionItem[]>([]);

  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedPointId, setSelectedPointId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  const todayRange = useMemo(() => getTodayRange(), []);
  const [fromDateTime, setFromDateTime] = useState(todayRange.from);
  const [toDateTime, setToDateTime] = useState(todayRange.to);

  const [preview, setPreview] = useState<{ meta: any; rows: VisitLogRow[] } | null>(null);
  const [loadingScopeOptions, setLoadingScopeOptions] = useState(false);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState('');
  const [deepLinkApplied, setDeepLinkApplied] = useState(false);
  const [autoLoadedFromParams, setAutoLoadedFromParams] = useState(false);

  const resolvedBranchId = useMemo(() => {
    if (isSystemAdmin || isOrganizationAdmin) return selectedBranchId;
    return sessionBranchId || '';
  }, [isSystemAdmin, isOrganizationAdmin, selectedBranchId, sessionBranchId]);

  async function loadBranchesByOrganization(nextOrganizationId: string): Promise<void> {
    if (!nextOrganizationId) {
      setBranches([]);
      setSelectedBranchId('');
      return;
    }
    const response = await fetch(`/api/branches?organizationId=${encodeURIComponent(nextOrganizationId)}`);
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || 'تعذر تحميل الفروع');
    const list = Array.isArray(data?.branches) ? data.branches : [];
    const mapped = list.map((item: any) => ({
      _id: String(item._id ?? item.id),
      name: String(item.nameAr ?? item.name ?? 'فرع'),
    }));
    setBranches(mapped);
    setSelectedBranchId((current) => (current && mapped.some((b: OptionItem) => b._id === current) ? current : ''));
  }

  useEffect(() => {
    if (!isSystemAdmin) return;
    let cancelled = false;
    (async () => {
      setLoadingScopeOptions(true);
      try {
        const response = await fetch('/api/organizations');
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || 'تعذر تحميل المؤسسات');
        const list = Array.isArray(data?.organizations) ? data.organizations : [];
        const mapped = list.map((item: any) => ({
          _id: String(item._id),
          name: String(item.nameAr || item.name || 'مؤسسة'),
        }));
        if (!cancelled) setOrganizations(mapped);
      } finally {
        if (!cancelled) setLoadingScopeOptions(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isSystemAdmin]);

  useEffect(() => {
    if (isSystemAdmin && selectedOrganizationId) {
      loadBranchesByOrganization(selectedOrganizationId);
      return;
    }
    if (isOrganizationAdmin && organizationId) {
      let cancelled = false;
      setLoadingScopeOptions(true);
      fetch(`/api/branches?organizationId=${encodeURIComponent(organizationId)}`)
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return;
          const list = Array.isArray(data?.branches) ? data.branches : [];
          const mapped = list.map((item: any) => ({
            _id: String(item._id ?? item.id),
            name: String(item.nameAr ?? item.name ?? 'فرع'),
          }));
          setBranches(mapped);
          setSelectedBranchId((current) =>
            current && mapped.some((b: OptionItem) => b._id === current) ? current : ''
          );
        })
        .catch(() => { if (!cancelled) setBranches([]); })
        .finally(() => { if (!cancelled) setLoadingScopeOptions(false); });
      return () => { cancelled = true; };
    }
  }, [isSystemAdmin, isOrganizationAdmin, organizationId, selectedOrganizationId]);

  useEffect(() => {
    if (!resolvedBranchId) {
      setPoints([]);
      setVehicles([]);
      setSelectedPointId('');
      setSelectedVehicleId('');
      return;
    }
    let cancelled = false;
    setLoadingPoints(true);
    Promise.all([
      fetch(`/api/points?branchId=${encodeURIComponent(resolvedBranchId)}`).then((res) => res.json()),
      fetch(`/api/vehicles?branchId=${encodeURIComponent(resolvedBranchId)}`).then((res) => res.json()),
    ])
      .then(([pointsData, vehiclesData]) => {
        if (cancelled) return;
        const list = Array.isArray(pointsData?.points) ? pointsData.points : [];
        const vehicleList = Array.isArray(vehiclesData?.vehicles) ? vehiclesData.vehicles : [];
        setPoints(
          list.map((item: any) => ({
            _id: String(item._id),
            name: String(item.nameAr || item.name || item.zoneId || '-'),
          }))
        );
        setVehicles(
          vehicleList.map((item: any) => ({
            _id: String(item._id),
            name: String(item.name || item.plateNumber || item.imei || labels.vehicleLabel || 'مركبة'),
          }))
        );
        setSelectedPointId((current) => (current && list.some((p: any) => String(p._id) === current) ? current : ''));
        setSelectedVehicleId((current) => (current && vehicleList.some((v: any) => String(v._id) === current) ? current : ''));
      })
      .catch(() => {
        if (!cancelled) {
          setPoints([]);
          setVehicles([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPoints(false);
      });
    return () => { cancelled = true; };
  }, [labels.vehicleLabel, resolvedBranchId]);

  useEffect(() => {
    if (deepLinkApplied) return;

    const organizationParam = searchParams.get('organizationId') || '';
    const branchParam = searchParams.get('branchId') || '';
    const pointParam = searchParams.get('pointId') || '';
    const vehicleParam = searchParams.get('vehicleId') || '';
    const tabParam = searchParams.get('tab') as VisitLogTab | null;
    const fromParam = searchParams.get('from') || '';
    const toParam = searchParams.get('to') || '';

    if (isSystemAdmin && organizationParam) {
      setSelectedOrganizationId(organizationParam);
    }

    if ((isSystemAdmin || isOrganizationAdmin) && branchParam) {
      setSelectedBranchId(branchParam);
    }

    if (pointParam) setSelectedPointId(pointParam);
    if (vehicleParam) setSelectedVehicleId(vehicleParam);
    if (tabParam && TAB_OPTIONS.some((option) => option.value === tabParam)) {
      setActiveTab(tabParam);
    }

    if (fromParam) {
      const parsedFrom = new Date(fromParam);
      if (!Number.isNaN(parsedFrom.getTime())) setFromDateTime(toLocalDateTimeInput(parsedFrom));
    }

    if (toParam) {
      const parsedTo = new Date(toParam);
      if (!Number.isNaN(parsedTo.getTime())) setToDateTime(toLocalDateTimeInput(parsedTo));
    }

    setDeepLinkApplied(true);
  }, [deepLinkApplied, isOrganizationAdmin, isSystemAdmin, searchParams]);

  const buildRequestParams = useCallback((page: number): URLSearchParams => {
    const params = new URLSearchParams();
    if (resolvedBranchId) params.set('branchId', resolvedBranchId);
    params.set('from', fromDateTime);
    params.set('to', toDateTime);
    params.set('tab', activeTab);
    params.set('page', String(page));
    params.set('pageSize', String(PAGE_SIZE));
    if (selectedPointId) params.set('pointId', selectedPointId);
    if (selectedVehicleId) params.set('vehicleId', selectedVehicleId);
    return params;
  }, [activeTab, fromDateTime, resolvedBranchId, selectedPointId, selectedVehicleId, toDateTime]);

  const validateScope = useCallback((): string | null => {
    if (!resolvedBranchId) return 'يرجى تحديد الفرع';
    return null;
  }, [resolvedBranchId]);

  const loadPreview = useCallback(async (page: number): Promise<void> => {
    const scopeError = validateScope();
    if (scopeError) {
      setError(scopeError);
      return;
    }
    const from = new Date(fromDateTime);
    const to = new Date(toDateTime);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      setError('تنسيق الفترة الزمنية غير صالح');
      return;
    }
    if (from.getTime() > to.getTime()) {
      setError('وقت البداية يجب أن يكون قبل وقت النهاية');
      return;
    }
    setLoadingPreview(true);
    setError('');
    try {
      const params = buildRequestParams(page);
      const response = await fetch(`/api/visit-log/preview?${params.toString()}`);
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'تعذر تحميل سجل الزيارات');
      setPreview(data);
    } catch (e: any) {
      setPreview(null);
      setError(e?.message || 'حدث خطأ أثناء تحميل سجل الزيارات');
    } finally {
      setLoadingPreview(false);
    }
  }, [buildRequestParams, fromDateTime, toDateTime, validateScope]);

  useEffect(() => {
    if (autoLoadedFromParams || !deepLinkApplied || !resolvedBranchId || loadingScopeOptions || loadingPoints || loadingPreview) return;
    const hasDeepLinkTarget =
      Boolean(searchParams.get('vehicleId')) ||
      Boolean(searchParams.get('pointId')) ||
      Boolean(searchParams.get('from')) ||
      Boolean(searchParams.get('to')) ||
      Boolean(searchParams.get('tab'));
    if (!hasDeepLinkTarget) return;
    setAutoLoadedFromParams(true);
    void loadPreview(1);
  }, [autoLoadedFromParams, deepLinkApplied, loadPreview, loadingPoints, loadingPreview, loadingScopeOptions, resolvedBranchId, searchParams]);

  const exportUrl = (() => {
    if (validateScope()) return '';
    const from = new Date(fromDateTime);
    const to = new Date(toDateTime);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from.getTime() > to.getTime()) return '';
    const params = buildRequestParams(1);
    params.delete('page');
    params.delete('pageSize');
    return `/api/visit-log/export?${params.toString()}`;
  })();

  const showBranchSelectors = isSystemAdmin || isOrganizationAdmin;
  const disablePreview = loadingPreview || loadingScopeOptions || loadingPoints;

  const isEventTab = ['entries', 'exits', 'repeated-entries', 'repeated-exits'].includes(activeTab);
  const isRepeatedPointsTab = activeTab === 'repeated-points';

  function getRowKey(row: VisitLogRow, index: number): string {
    if (row.eventId) return row.eventId;
    if (row.visitId) return row.visitId;
    return `${row.pointId}-${index}`;
  }

  return (
    <Card className="text-right">
      <CardHeader>
        <CardTitle>سجل الزيارات</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap justify-end gap-2">
          {TAB_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setActiveTab(opt.value);
                setPreview(null);
                setError('');
              }}
              className={`rounded-lg border px-3 py-2 text-sm ${
                activeTab === opt.value ? 'bg-primary text-primary-foreground' : 'bg-background'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {showBranchSelectors && (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {isSystemAdmin && (
              <div className="space-y-1">
                <label className="text-sm">المؤسسة</label>
                <select
                  value={selectedOrganizationId}
                  onChange={(e) => {
                    setSelectedOrganizationId(e.target.value);
                    setSelectedBranchId('');
                    setPreview(null);
                  }}
                  className="w-full rounded-lg border bg-background px-3 py-2"
                >
                  <option value="">اختر المؤسسة</option>
                  {organizations.map((org) => (
                    <option key={org._id} value={org._id}>{org.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm">{labels.branchLabel || 'الفرع'}</label>
              <select
                value={selectedBranchId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value);
                  setPreview(null);
                }}
                className="w-full rounded-lg border bg-background px-3 py-2"
                disabled={(isSystemAdmin && !selectedOrganizationId) || (isOrganizationAdmin && loadingScopeOptions)}
              >
                <option value="">{`اختر ${labels.branchLabel || 'الفرع'}`}</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm">من</label>
            <input
              type="datetime-local"
              value={fromDateTime}
              onChange={(e) => setFromDateTime(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm">إلى</label>
            <input
              type="datetime-local"
              value={toDateTime}
              onChange={(e) => setToDateTime(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm">{labels.pointLabel || 'النقطة'} (اختياري)</label>
          <select
            value={selectedPointId}
            onChange={(e) => {
              setSelectedPointId(e.target.value);
              setPreview(null);
            }}
            className="w-full rounded-lg border bg-background px-3 py-2"
            disabled={loadingPoints || !resolvedBranchId}
          >
            <option value="">الكل</option>
            {points.map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm">{labels.vehicleLabel || 'المركبة'} (اختياري)</label>
          <select
            value={selectedVehicleId}
            onChange={(e) => {
              setSelectedVehicleId(e.target.value);
              setPreview(null);
            }}
            className="w-full rounded-lg border bg-background px-3 py-2"
            disabled={loadingPoints || !resolvedBranchId}
          >
            <option value="">الكل</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle._id} value={vehicle._id}>{vehicle.name}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => void loadPreview(1)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            disabled={disablePreview}
          >
            {loadingPreview ? 'جارٍ التحميل...' : 'عرض السجل'}
          </button>
          <a
            href={exportUrl || '#'}
            onClick={(e) => { if (!exportUrl) e.preventDefault(); }}
            className={exportUrl ? 'rounded-lg border px-4 py-2 text-sm hover:bg-accent' : 'pointer-events-none rounded-lg border px-4 py-2 text-sm opacity-50'}
          >
            تصدير CSV
          </a>
        </div>

        {preview && (
          <>
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    {isRepeatedPointsTab ? (
                      <>
                        <th className="px-3 py-2 text-right font-medium whitespace-nowrap">النقطة</th>
                        <th className="px-3 py-2 text-right font-medium whitespace-nowrap">عدد الزيارات</th>
                        <th className="px-3 py-2 text-right font-medium whitespace-nowrap">آخر زيارة</th>
                      </>
                    ) : isEventTab ? (
                      <>
                        <th className="px-3 py-2 text-right font-medium whitespace-nowrap">النقطة</th>
                        <th className="px-3 py-2 text-right font-medium whitespace-nowrap">{labels.vehicleLabel || 'المركبة'}</th>
                        <th className="px-3 py-2 text-right font-medium whitespace-nowrap">لوحة</th>
                        <th className="px-3 py-2 text-right font-medium whitespace-nowrap">السائق</th>
                        <th className="px-3 py-2 text-right font-medium whitespace-nowrap">الوقت</th>
                        <th className="px-3 py-2 text-right font-medium whitespace-nowrap">النوع</th>
                        <th className="px-3 py-2 text-right font-medium whitespace-nowrap">مكرر</th>
                      </>
                    ) : (
                      <>
                        <th className="px-3 py-2 text-right font-medium whitespace-nowrap">النقطة</th>
                        <th className="px-3 py-2 text-right font-medium whitespace-nowrap">{labels.vehicleLabel || 'المركبة'}</th>
                        <th className="px-3 py-2 text-right font-medium whitespace-nowrap">لوحة</th>
                        <th className="px-3 py-2 text-right font-medium whitespace-nowrap">السائق</th>
                        <th className="px-3 py-2 text-right font-medium whitespace-nowrap">وقت الدخول</th>
                        <th className="px-3 py-2 text-right font-medium whitespace-nowrap">وقت الخروج</th>
                        <th className="px-3 py-2 text-right font-medium whitespace-nowrap">المدة (ث)</th>
                        <th className="px-3 py-2 text-right font-medium whitespace-nowrap">نوع الزيارة</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.length === 0 ? (
                    <tr>
                      <td
                        className="px-3 py-4 text-center text-muted-foreground"
                        colSpan={isRepeatedPointsTab ? 3 : isEventTab ? 7 : 8}
                      >
                        لا توجد بيانات ضمن الفلاتر الحالية
                      </td>
                    </tr>
                  ) : (
                    preview.rows.map((row, idx) => (
                      <tr key={getRowKey(row, idx)} className="border-t">
                        {isRepeatedPointsTab ? (
                          <>
                            <td className="px-3 py-2 whitespace-nowrap">{formatCell(row.pointName)}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{formatCell(row.visitCount)}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{formatEventTime(row.lastVisitTime)}</td>
                          </>
                        ) : isEventTab ? (
                          <>
                            <td className="px-3 py-2 whitespace-nowrap">{formatCell(row.pointName)}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{formatCell(row.vehicleName)}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{formatCell(row.plateNumber)}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{formatCell(row.driverName)}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{formatEventTime(row.eventTime)}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{row.eventType === 'zone_in' ? 'دخول' : 'خروج'}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{row.isRepeated ? 'نعم' : 'لا'}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-2 whitespace-nowrap">{formatCell(row.pointName)}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{formatCell(row.vehicleName)}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{formatCell(row.plateNumber)}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{formatCell(row.driverName)}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{formatEventTime(row.entryTime)}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{formatEventTime(row.exitTime)}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{formatCell(row.durationSeconds)}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{formatVisitKind(row.visitKind)}</td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {preview.meta.totalPages > 1 && (
              <div className="flex items-center justify-end gap-2">
                <span className="text-sm text-muted-foreground">
                  صفحة {preview.meta.page} من {preview.meta.totalPages} (إجمالي {preview.meta.total})
                </span>
                <button
                  type="button"
                  className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                  disabled={loadingPreview || preview.meta.page <= 1}
                  onClick={() => void loadPreview(preview.meta.page - 1)}
                >
                  السابق
                </button>
                <button
                  type="button"
                  className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                  disabled={loadingPreview || preview.meta.page >= preview.meta.totalPages}
                  onClick={() => void loadPreview(preview.meta.page + 1)}
                >
                  التالي
                </button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
