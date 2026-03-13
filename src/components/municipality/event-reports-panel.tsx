'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MultiSelectWithSearch } from '@/components/ui/multi-select-with-search';
import { useLabels } from '@/hooks/use-labels';
import type {
  EventReportHeader,
  EventReportPreviewResponse,
  EventReportSummary,
} from '@/lib/types/event-reports';

type EventReportsPanelProps = {
  isSystemAdmin?: boolean;
  isOrganizationAdmin?: boolean;
  organizationId?: string | null;
  sessionBranchId?: string | null;
};

type OptionItem = {
  _id: string;
  name: string;
};

type ActiveTab = 'vehicle' | 'point';
type GenericReportRow = Record<string, string | number | null>;

type PreviewPayload = EventReportPreviewResponse<GenericReportRow>;

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

  return {
    from: toLocalDateTimeInput(start),
    to: toLocalDateTimeInput(end),
  };
}

function normalizeCellValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '-';
  const trimmed = value.trim();
  return trimmed.length ? trimmed : '-';
}

export function EventReportsPanel({
  isSystemAdmin = false,
  isOrganizationAdmin = false,
  organizationId,
  sessionBranchId,
}: EventReportsPanelProps) {
  const { labels } = useLabels();
  const [activeTab, setActiveTab] = useState<ActiveTab>('vehicle');
  const [organizations, setOrganizations] = useState<OptionItem[]>([]);
  const [branches, setBranches] = useState<OptionItem[]>([]);
  const [vehicles, setVehicles] = useState<OptionItem[]>([]);
  const [points, setPoints] = useState<OptionItem[]>([]);

  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [selectedPointIds, setSelectedPointIds] = useState<string[]>([]);

  const todayRange = useMemo(() => getTodayRange(), []);
  const [fromDateTime, setFromDateTime] = useState(todayRange.from);
  const [toDateTime, setToDateTime] = useState(todayRange.to);

  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [loadingScopeOptions, setLoadingScopeOptions] = useState(false);
  const [loadingReportOptions, setLoadingReportOptions] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState('');

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
    if (!response.ok) {
      throw new Error(data?.error || 'تعذر تحميل الفروع');
    }

    const list = Array.isArray(data?.branches) ? data.branches : [];
    const mapped = list.map((item: any) => ({
      _id: String(item._id),
      name: String(item.nameAr || item.name || 'فرع'),
    }));

    setBranches(mapped);
    setSelectedBranchId((current) => {
      if (current && mapped.some((branch: OptionItem) => branch._id === current)) return current;
      if (mapped.length === 1) return mapped[0]._id;
      return '';
    });
  }

  async function loadOrganizationBranches(): Promise<void> {
    const response = await fetch('/api/branches');
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.error || 'تعذر تحميل الفروع');
    }

    const list = Array.isArray(data?.branches) ? data.branches : [];
    const mapped = list.map((item: any) => ({
      _id: String(item._id),
      name: String(item.nameAr || item.name || 'فرع'),
    }));

    setBranches(mapped);
    setSelectedBranchId((current) => {
      if (current && mapped.some((branch: OptionItem) => branch._id === current)) return current;
      if (mapped.length === 1) return mapped[0]._id;
      return '';
    });
  }

  useEffect(() => {
    let active = true;

    async function loadScopeOptions() {
      if (!isSystemAdmin && !isOrganizationAdmin) return;

      setLoadingScopeOptions(true);
      try {
        if (isSystemAdmin) {
          const response = await fetch('/api/organizations');
          const data = await response.json().catch(() => null);
          if (!response.ok) throw new Error(data?.error || 'تعذر تحميل المؤسسات');

          const list = Array.isArray(data?.organizations) ? data.organizations : [];
          const mapped = list.map((item: any) => ({
            _id: String(item._id),
            name: String(item.name || 'مؤسسة'),
          }));

          if (!active) return;
          setOrganizations(mapped);
          setSelectedOrganizationId((current) => {
            if (current && mapped.some((org: OptionItem) => org._id === current)) return current;
            if (mapped.length === 1) return mapped[0]._id;
            return '';
          });
          return;
        }

        if (isOrganizationAdmin) {
          await loadOrganizationBranches();
        }
      } catch (scopeError: any) {
        if (active) {
          setError(scopeError?.message || 'تعذر تحميل نطاق التقرير');
        }
      } finally {
        if (active) setLoadingScopeOptions(false);
      }
    }

    void loadScopeOptions();
    return () => {
      active = false;
    };
  }, [isSystemAdmin, isOrganizationAdmin]);

  useEffect(() => {
    if (!isSystemAdmin) return;
    setError('');
    void loadBranchesByOrganization(selectedOrganizationId).catch((branchError: any) => {
      setError(branchError?.message || 'تعذر تحميل الفروع');
    });
  }, [isSystemAdmin, selectedOrganizationId]);

  useEffect(() => {
    let active = true;

    async function loadReportOptions() {
      if (!resolvedBranchId) {
        setVehicles([]);
        setPoints([]);
        setSelectedVehicleIds([]);
        setSelectedPointIds([]);
        return;
      }

      setLoadingReportOptions(true);
      try {
        const [vehiclesRes, pointsRes] = await Promise.all([
          fetch(`/api/vehicles?branchId=${encodeURIComponent(resolvedBranchId)}`),
          fetch(`/api/points?branchId=${encodeURIComponent(resolvedBranchId)}`),
        ]);

        const vehiclesData = await vehiclesRes.json().catch(() => null);
        const pointsData = await pointsRes.json().catch(() => null);

        if (!vehiclesRes.ok) {
          throw new Error(vehiclesData?.error || 'تعذر تحميل المركبات');
        }
        if (!pointsRes.ok) {
          throw new Error(pointsData?.error || 'تعذر تحميل النقاط');
        }

        const vehiclesList = Array.isArray(vehiclesData?.vehicles) ? vehiclesData.vehicles : [];
        const pointsList = Array.isArray(pointsData?.points) ? pointsData.points : [];

        const mappedVehicles: OptionItem[] = vehiclesList.map((item: any) => ({
          _id: String(item._id),
          name: String(item.name || item.plateNumber || item.imei || labels.vehicleLabel),
        }));

        const mappedPoints: OptionItem[] = pointsList.map((item: any) => ({
          _id: String(item._id),
          name: String(item.nameAr || item.name || labels.pointLabel),
        }));

        if (!active) return;

        setVehicles(mappedVehicles);
        setPoints(mappedPoints);
        setSelectedVehicleIds((current) =>
          current.filter((id) => mappedVehicles.some((v) => v._id === id))
        );
        setSelectedPointIds((current) =>
          current.filter((id) => mappedPoints.some((p) => p._id === id))
        );
      } catch (optionsError: any) {
        if (active) {
          setError(optionsError?.message || 'تعذر تحميل خيارات التقرير');
          setVehicles([]);
          setPoints([]);
        }
      } finally {
        if (active) setLoadingReportOptions(false);
      }
    }

    void loadReportOptions();
    return () => {
      active = false;
    };
  }, [resolvedBranchId, labels.pointLabel, labels.vehicleLabel]);

  function validateScope(): string | null {
    if (isSystemAdmin) {
      if (!selectedOrganizationId) return 'يرجى اختيار المؤسسة';
      if (!selectedBranchId) return 'يرجى اختيار الفرع';
      return null;
    }

    if (isOrganizationAdmin && !selectedBranchId) {
      return 'يرجى اختيار الفرع';
    }

    if (!isSystemAdmin && !isOrganizationAdmin && !sessionBranchId) {
      return 'لا يوجد فرع مرتبط بالحساب';
    }

    return null;
  }

  function buildRequestParams(page: number): URLSearchParams {
    const params = new URLSearchParams();

    if (isSystemAdmin && selectedOrganizationId) {
      params.set('organizationId', selectedOrganizationId);
    }

    if (resolvedBranchId) {
      params.set('branchId', resolvedBranchId);
    }

    if (fromDateTime) {
      params.set('from', new Date(fromDateTime).toISOString());
    }
    if (toDateTime) {
      params.set('to', new Date(toDateTime).toISOString());
    }

    params.set('page', String(page));
    params.set('pageSize', String(PAGE_SIZE));

    if (activeTab === 'vehicle') {
      selectedVehicleIds.forEach((id) => params.append('vehicleIds', id));
    } else {
      selectedPointIds.forEach((id) => params.append('pointIds', id));
    }

    return params;
  }

  async function loadPreview(page = 1): Promise<void> {
    const scopeValidationError = validateScope();
    if (scopeValidationError) {
      setError(scopeValidationError);
      return;
    }

    if (activeTab === 'vehicle' && selectedVehicleIds.length === 0) {
      setError(`يرجى اختيار ${labels.vehicleLabel}`);
      return;
    }
    if (activeTab === 'point' && selectedPointIds.length === 0) {
      setError(`يرجى اختيار ${labels.pointLabel}`);
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
      const endpoint =
        activeTab === 'vehicle'
          ? '/api/event-reports/vehicle/preview'
          : '/api/event-reports/point/preview';
      const params = buildRequestParams(page);
      const response = await fetch(`${endpoint}?${params.toString()}`);
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'تعذر تحميل التقرير');
      }
      setPreview(data as PreviewPayload);
    } catch (previewError: any) {
      setPreview(null);
      setError(previewError?.message || 'حدث خطأ أثناء تحميل التقرير');
    } finally {
      setLoadingPreview(false);
    }
  }

  const exportUrl = (() => {
    const scopeValidationError = validateScope();
    if (scopeValidationError) return '';

    if (activeTab === 'vehicle' && selectedVehicleIds.length === 0) return '';
    if (activeTab === 'point' && selectedPointIds.length === 0) return '';

    const from = new Date(fromDateTime);
    const to = new Date(toDateTime);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from.getTime() > to.getTime()) {
      return '';
    }

    const endpoint =
      activeTab === 'vehicle'
        ? '/api/event-reports/vehicle/export'
        : '/api/event-reports/point/export';
    const params = buildRequestParams(1);
    params.delete('page');
    params.delete('pageSize');

    return `${endpoint}?${params.toString()}`;
  })();

  const summaryItems = useMemo(() => {
    if (!preview) return [];
    const summary: EventReportSummary = preview.summary;
    return [
      { key: 'totalRecords', label: 'إجمالي السجلات', value: summary.totalRecords },
      { key: 'totalEntries', label: 'إجمالي الدخول', value: summary.totalEntries },
      { key: 'totalExits', label: 'إجمالي الخروج', value: summary.totalExits },
      { key: 'totalVisits', label: 'الزيارات المحتسبة', value: summary.totalVisits },
      { key: 'totalVehicles', label: `عدد ${labels.vehicleLabel}`, value: summary.totalVehicles },
      { key: 'totalPoints', label: `عدد ${labels.pointLabel}`, value: summary.totalPoints },
      {
        key: 'totalStayDurationSeconds',
        label: 'إجمالي مدة الزيارة (ثانية)',
        value: summary.totalStayDurationSeconds,
      },
    ];
  }, [preview, labels.pointLabel, labels.vehicleLabel]);

  const disablePreview = loadingPreview || loadingScopeOptions || loadingReportOptions;
  const showBranchSelectors = isSystemAdmin || isOrganizationAdmin;

  return (
    <Card className="text-right">
      <CardHeader>
        <CardTitle>{labels.eventsReportLabel || 'تقارير الأحداث'} المخصصة</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('vehicle');
              setPreview(null);
              setError('');
            }}
            className={`rounded-lg border px-4 py-2 text-sm ${
              activeTab === 'vehicle' ? 'bg-primary text-primary-foreground' : 'bg-background'
            }`}
          >
            تقرير مركبة
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('point');
              setPreview(null);
              setError('');
            }}
            className={`rounded-lg border px-4 py-2 text-sm ${
              activeTab === 'point' ? 'bg-primary text-primary-foreground' : 'bg-background'
            }`}
          >
            تقرير نقطة
          </button>
        </div>

        {showBranchSelectors && (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {isSystemAdmin && (
              <div className="space-y-1">
                <label className="text-sm">المؤسسة</label>
                <select
                  value={selectedOrganizationId}
                  onChange={(event) => {
                    setSelectedOrganizationId(event.target.value);
                    setSelectedBranchId('');
                    setPreview(null);
                  }}
                  className="w-full rounded-lg border bg-background px-3 py-2"
                >
                  <option value="">اختر المؤسسة</option>
                  {organizations.map((organization) => (
                    <option key={organization._id} value={organization._id}>
                      {organization.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm">{labels.branchLabel || 'الفرع'}</label>
              <select
                value={selectedBranchId}
                onChange={(event) => {
                  setSelectedBranchId(event.target.value);
                  setPreview(null);
                }}
                className="w-full rounded-lg border bg-background px-3 py-2"
                disabled={isSystemAdmin && !selectedOrganizationId}
              >
                <option value="">{`اختر ${labels.branchLabel || 'الفرع'}`}</option>
                {branches.map((branch) => (
                  <option key={branch._id} value={branch._id}>
                    {branch.name}
                  </option>
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
              onChange={(event) => setFromDateTime(event.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm">إلى</label>
            <input
              type="datetime-local"
              value={toDateTime}
              onChange={(event) => setToDateTime(event.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2"
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {activeTab === 'vehicle' ? (
            <div className="space-y-1">
              <MultiSelectWithSearch
                label={labels.vehicleLabel}
                options={vehicles}
                value={selectedVehicleIds}
                onChange={setSelectedVehicleIds}
                placeholder={`اختر ${labels.vehicleLabel}`}
                emptyMessage={`لا توجد ${labels.vehicleLabel}`}
                disabled={loadingReportOptions || !resolvedBranchId}
              />
            </div>
          ) : (
            <div className="space-y-1">
              <MultiSelectWithSearch
                label={labels.pointLabel}
                options={points}
                value={selectedPointIds}
                onChange={setSelectedPointIds}
                placeholder={`اختر ${labels.pointLabel}`}
                emptyMessage={`لا توجد ${labels.pointLabel}`}
                disabled={loadingReportOptions || !resolvedBranchId}
              />
            </div>
          )}
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
            {loadingPreview ? 'جارٍ التحميل...' : 'عرض التقرير'}
          </button>

          <a
            href={exportUrl || '#'}
            onClick={(event) => {
              if (!exportUrl) {
                event.preventDefault();
              }
            }}
            className={`rounded-lg border px-4 py-2 text-sm ${
              exportUrl ? 'hover:bg-accent' : 'pointer-events-none opacity-50'
            }`}
          >
            تصدير Excel
          </a>
        </div>

        {preview && (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {summaryItems.map((item) => (
                <div key={item.key} className="rounded-lg border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                  <div className="mt-1 text-lg font-semibold">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    {preview.headers.map((header: EventReportHeader) => (
                      <th key={header.key} className="px-3 py-2 text-right font-medium whitespace-nowrap">
                        {header.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.length === 0 ? (
                    <tr>
                      <td className="px-3 py-4 text-center text-muted-foreground" colSpan={preview.headers.length}>
                        لا توجد بيانات ضمن الفلاتر الحالية
                      </td>
                    </tr>
                  ) : (
                    preview.rows.map((row, rowIndex) => {
                      const rawId = row['id'];
                      const rawVehicleKey = row['vehicleKey'];
                      const rowId =
                        (typeof rawId === 'string' && rawId.trim()) ||
                        (typeof rawVehicleKey === 'string' && rawVehicleKey.trim()) ||
                        String(rowIndex);
                      return (
                        <tr key={rowId} className="border-t">
                          {preview.headers.map((header: EventReportHeader) => (
                            <td key={`${rowId}-${header.key}`} className="px-3 py-2 whitespace-nowrap">
                              {normalizeCellValue(row[header.key])}
                            </td>
                          ))}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {preview.meta.totalPages > 1 && (
              <div className="flex items-center justify-end gap-2">
                <span className="text-sm text-muted-foreground">
                  صفحة {preview.meta.page} من {preview.meta.totalPages}
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
