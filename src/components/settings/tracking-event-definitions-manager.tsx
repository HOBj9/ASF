'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loading } from '@/components/ui/loading';
import { MultiSelectWithSearch } from '@/components/ui/multi-select-with-search';
import { cn } from '@/lib/utils';

type BranchOption = {
  _id: string;
  name?: string | null;
  nameAr?: string | null;
};

type VehicleOption = {
  _id: string;
  name?: string | null;
  plateNumber?: string | null;
};

type PointOption = {
  _id: string;
  name?: string | null;
  nameAr?: string | null;
  nameEn?: string | null;
};

type ProviderTarget = 'athar' | 'mobile_app';
type TrackingEventType = 'zone_in' | 'zone_out';

type DefinitionRow = {
  _id: string;
  branchId: string;
  vehicleId?: {
    _id: string;
    name?: string | null;
    plateNumber?: string | null;
  } | string | null;
  pointId?: {
    _id: string;
    name?: string | null;
    nameAr?: string | null;
    nameEn?: string | null;
    zoneId?: string | null;
  } | string | null;
  providerTarget: ProviderTarget;
  eventType: TrackingEventType;
  isActive: boolean;
  externalSyncStatus?: 'not_required' | 'pending' | 'synced' | 'failed';
  externalSyncError?: string | null;
  externalEventId?: string | null;
  updatedAt?: string;
};

type CoverageItem = {
  vehiclesCount: number;
  pointsCount: number;
  activeDefinitionsCount: number;
  uncoveredVehicles: Array<{ _id: string; name: string; plateNumber?: string | null }>;
  uncoveredPoints: Array<{ _id: string; name: string; zoneId?: string | null }>;
  failedDefinitions: Array<{ _id: string; vehicleId: string; pointId: string; pointName: string; externalSyncError?: string | null }>;
};

type CoverageResponse = {
  branchId: string;
  coverageByProvider: Record<ProviderTarget, CoverageItem>;
};

const providerLabels: Record<ProviderTarget, string> = {
  athar: 'أثر',
  mobile_app: 'GPS الموبايل',
};

const eventTypeLabels: Record<TrackingEventType, string> = {
  zone_in: 'دخول',
  zone_out: 'خروج',
};

function getBranchLabel(branch: BranchOption) {
  return branch.nameAr || branch.name || branch._id;
}

function getVehicleLabel(vehicle: VehicleOption) {
  return vehicle.name || vehicle.plateNumber || vehicle._id;
}

function getPointLabel(point: PointOption) {
  return point.nameAr || point.nameEn || point.name || point._id;
}

function getDefinitionVehicleLabel(definition: DefinitionRow) {
  if (!definition.vehicleId || typeof definition.vehicleId === 'string') {
    return definition.vehicleId || '-';
  }
  return definition.vehicleId.name || definition.vehicleId.plateNumber || definition.vehicleId._id;
}

function getDefinitionPointLabel(definition: DefinitionRow) {
  if (!definition.pointId || typeof definition.pointId === 'string') {
    return definition.pointId || '-';
  }
  return definition.pointId.nameAr || definition.pointId.nameEn || definition.pointId.name || definition.pointId._id;
}

function syncStatusLabel(status?: DefinitionRow['externalSyncStatus']) {
  switch (status) {
    case 'synced':
      return 'متزامن';
    case 'failed':
      return 'فشل';
    case 'pending':
      return 'بانتظار المزامنة';
    case 'not_required':
      return 'غير مطلوب';
    default:
      return '-';
  }
}

function syncStatusClass(status?: DefinitionRow['externalSyncStatus']) {
  switch (status) {
    case 'synced':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'failed':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'not_required':
      return 'bg-slate-50 text-slate-600 border-slate-200';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200';
  }
}

export function TrackingEventDefinitionsManager({
  organizationId,
  sessionBranchId,
  branches,
}: {
  organizationId: string | null;
  sessionBranchId: string | null;
  branches: BranchOption[];
}) {
  const normalizedBranches = useMemo(
    () => branches.map((branch) => ({ ...branch, _id: String(branch._id) })),
    [branches]
  );
  const defaultBranchId = sessionBranchId || normalizedBranches[0]?._id || '';

  const [selectedBranchId, setSelectedBranchId] = useState(defaultBranchId);
  const [providerTarget, setProviderTarget] = useState<ProviderTarget>('athar');
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [selectedPointIds, setSelectedPointIds] = useState<string[]>([]);
  const [selectedEventTypes, setSelectedEventTypes] = useState<TrackingEventType[]>(['zone_in', 'zone_out']);
  const [selectedDefinitionIds, setSelectedDefinitionIds] = useState<string[]>([]);

  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [points, setPoints] = useState<PointOption[]>([]);
  const [definitions, setDefinitions] = useState<DefinitionRow[]>([]);
  const [coverage, setCoverage] = useState<CoverageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const branchOptions = useMemo(
    () => normalizedBranches.map((branch) => ({ _id: branch._id, name: getBranchLabel(branch) })),
    [normalizedBranches]
  );
  const vehicleOptions = useMemo(
    () => vehicles.map((vehicle) => ({ _id: vehicle._id, name: getVehicleLabel(vehicle) })),
    [vehicles]
  );
  const pointOptions = useMemo(
    () => points.map((point) => ({ _id: point._id, name: getPointLabel(point) })),
    [points]
  );
  const coverageItem = coverage?.coverageByProvider?.[providerTarget];

  const loadData = async (branchId: string, provider: ProviderTarget) => {
    if (!branchId) return;

    setLoading(true);
    try {
      const [vehiclesRes, pointsRes, definitionsRes, coverageRes]: any = await Promise.all([
        apiClient.get(`vehicles?branchId=${encodeURIComponent(branchId)}`),
        apiClient.get(`points?branchId=${encodeURIComponent(branchId)}`),
        apiClient.get(
          `tracking/event-definitions?branchId=${encodeURIComponent(branchId)}&providerTarget=${encodeURIComponent(provider)}`
        ),
        apiClient.get(
          `tracking/event-definitions/coverage?branchId=${encodeURIComponent(branchId)}&providerTarget=${encodeURIComponent(provider)}`
        ),
      ]);

      setVehicles(Array.isArray(vehiclesRes?.vehicles) ? vehiclesRes.vehicles : []);
      setPoints(Array.isArray(pointsRes?.points) ? pointsRes.points : []);
      setDefinitions(Array.isArray(definitionsRes?.definitions) ? definitionsRes.definitions : []);
      setCoverage(coverageRes?.coverage || null);
      setSelectedDefinitionIds([]);
    } catch (error: any) {
      toast.error(error?.message || 'فشل تحميل تعريفات الأحداث');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedBranchId && defaultBranchId) {
      setSelectedBranchId(defaultBranchId);
    }
  }, [defaultBranchId, selectedBranchId]);

  useEffect(() => {
    if (!selectedBranchId) return;
    loadData(selectedBranchId, providerTarget);
  }, [selectedBranchId, providerTarget]);

  const toggleEventType = (eventType: TrackingEventType) => {
    setSelectedEventTypes((current) => {
      if (current.includes(eventType)) {
        const next = current.filter((value) => value !== eventType);
        return next.length > 0 ? next : current;
      }
      return [...current, eventType];
    });
  };

  const handleCreateDefinitions = async () => {
    if (!selectedBranchId) {
      toast.error('يرجى اختيار الفرع');
      return;
    }
    if (selectedVehicleIds.length === 0) {
      toast.error('يرجى اختيار مركبة واحدة على الأقل');
      return;
    }
    if (selectedPointIds.length === 0) {
      toast.error('يرجى اختيار نقطة واحدة على الأقل');
      return;
    }

    setSaving(true);
    try {
      await apiClient.post('tracking/event-definitions', {
        branchId: selectedBranchId,
        providerTarget,
        vehicleIds: selectedVehicleIds,
        pointIds: selectedPointIds,
        eventTypes: selectedEventTypes,
        isActive: true,
      });
      toast.success('تم حفظ التعريفات');
      await loadData(selectedBranchId, providerTarget);
    } catch (error: any) {
      toast.error(error?.message || 'فشل حفظ التعريفات');
    } finally {
      setSaving(false);
    }
  };

  const updateDefinitionsState = async (isActive: boolean) => {
    if (!selectedBranchId || selectedDefinitionIds.length === 0) {
      toast.error('يرجى تحديد تعريف واحد على الأقل');
      return;
    }

    setSaving(true);
    try {
      await apiClient.patch('tracking/event-definitions/state', {
        branchId: selectedBranchId,
        definitionIds: selectedDefinitionIds,
        isActive,
      });
      toast.success(isActive ? 'تم تفعيل التعريفات' : 'تم تعطيل التعريفات');
      await loadData(selectedBranchId, providerTarget);
    } catch (error: any) {
      toast.error(error?.message || 'فشل تحديث حالة التعريفات');
    } finally {
      setSaving(false);
    }
  };

  const syncAtharDefinitions = async () => {
    if (!selectedBranchId || selectedDefinitionIds.length === 0) {
      toast.error('يرجى تحديد تعريف واحد على الأقل');
      return;
    }

    setSaving(true);
    try {
      await apiClient.post('tracking/event-definitions/sync-athar', {
        branchId: selectedBranchId,
        definitionIds: selectedDefinitionIds,
      });
      toast.success('تمت إعادة المزامنة');
      await loadData(selectedBranchId, providerTarget);
    } catch (error: any) {
      toast.error(error?.message || 'فشلت إعادة المزامنة');
    } finally {
      setSaving(false);
    }
  };

  const toggleDefinitionSelection = (definitionId: string) => {
    setSelectedDefinitionIds((current) =>
      current.includes(definitionId)
        ? current.filter((id) => id !== definitionId)
        : [...current, definitionId]
    );
  };

  const selectAllDefinitions = () => {
    if (selectedDefinitionIds.length === definitions.length) {
      setSelectedDefinitionIds([]);
      return;
    }
    setSelectedDefinitionIds(definitions.map((definition) => definition._id));
  };

  return (
    <Card className="text-right">
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">تعريفات أحداث التتبع</CardTitle>
            <CardDescription>
              إدارة تعريفات الدخول والخروج للمركبات والنقاط على مستوى الفرع، مع دعم أثر وGPS الموبايل من نفس الشاشة.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            className="gap-2 self-start"
            onClick={() => selectedBranchId && loadData(selectedBranchId, providerTarget)}
            disabled={!selectedBranchId || loading || saving}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            تحديث
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!selectedBranchId ? (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            {!organizationId && !sessionBranchId
              ? 'لا توجد مؤسسة أو فرع مرتبطان بالحساب.'
              : 'يرجى اختيار الفرع للبدء بإدارة تعريفات الأحداث.'}
          </div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2 xl:col-span-1">
                <Label>الفرع</Label>
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId} disabled={Boolean(sessionBranchId)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفرع" />
                  </SelectTrigger>
                  <SelectContent>
                    {normalizedBranches.map((branch) => (
                      <SelectItem key={branch._id} value={branch._id}>
                        {getBranchLabel(branch)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 xl:col-span-1">
                <Label>المزود</Label>
                <Select value={providerTarget} onValueChange={(value) => setProviderTarget(value as ProviderTarget)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المزود" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="athar">أثر</SelectItem>
                    <SelectItem value="mobile_app">GPS الموبايل</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 xl:col-span-2">
                <Label>أنواع الأحداث</Label>
                <div className="flex flex-wrap justify-end gap-3 rounded-md border p-3">
                  {(['zone_in', 'zone_out'] as TrackingEventType[]).map((eventType) => (
                    <label key={eventType} className="flex items-center gap-2 text-sm">
                      <span>{eventTypeLabels[eventType]}</span>
                      <Checkbox
                        checked={selectedEventTypes.includes(eventType)}
                        onCheckedChange={() => toggleEventType(eventType)}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <MultiSelectWithSearch
                label="المركبات"
                options={vehicleOptions}
                value={selectedVehicleIds}
                onChange={setSelectedVehicleIds}
                placeholder="اختر المركبات"
                emptyMessage="لا توجد مركبات"
                disabled={loading}
                className="xl:col-span-2"
              />

              <MultiSelectWithSearch
                label="النقاط"
                options={pointOptions}
                value={selectedPointIds}
                onChange={setSelectedPointIds}
                placeholder="اختر النقاط"
                emptyMessage="لا توجد نقاط"
                disabled={loading}
                className="xl:col-span-2"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" onClick={handleCreateDefinitions} disabled={saving || loading} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                إنشاء أو تحديث التعريفات
              </Button>
              <Button type="button" variant="outline" onClick={() => updateDefinitionsState(true)} disabled={saving || selectedDefinitionIds.length === 0}>
                تفعيل المحدد
              </Button>
              <Button type="button" variant="outline" onClick={() => updateDefinitionsState(false)} disabled={saving || selectedDefinitionIds.length === 0}>
                تعطيل المحدد
              </Button>
              {providerTarget === 'athar' && (
                <Button type="button" variant="outline" onClick={syncAtharDefinitions} disabled={saving || selectedDefinitionIds.length === 0}>
                  إعادة مزامنة أثر
                </Button>
              )}
            </div>

            {coverageItem ? (
              <div className="grid gap-4 xl:grid-cols-4">
                <div className="rounded-lg border bg-muted/20 p-4">
                  <div className="text-sm text-muted-foreground">المركبات المشمولة</div>
                  <div className="mt-2 text-2xl font-semibold">{coverageItem.vehiclesCount}</div>
                </div>
                <div className="rounded-lg border bg-muted/20 p-4">
                  <div className="text-sm text-muted-foreground">النقاط المشمولة</div>
                  <div className="mt-2 text-2xl font-semibold">{coverageItem.pointsCount}</div>
                </div>
                <div className="rounded-lg border bg-muted/20 p-4">
                  <div className="text-sm text-muted-foreground">التعريفات النشطة</div>
                  <div className="mt-2 text-2xl font-semibold">{coverageItem.activeDefinitionsCount}</div>
                </div>
                <div className="rounded-lg border bg-muted/20 p-4">
                  <div className="text-sm text-muted-foreground">التعريفات الفاشلة</div>
                  <div className="mt-2 text-2xl font-semibold">{coverageItem.failedDefinitions.length}</div>
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-lg border p-4">
                <div className="mb-3 font-medium">مركبات بلا تعريفات</div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {coverageItem?.uncoveredVehicles?.length ? (
                    coverageItem.uncoveredVehicles.slice(0, 8).map((vehicle) => (
                      <div key={vehicle._id} className="rounded-md bg-muted/20 px-3 py-2">
                        {vehicle.name}
                      </div>
                    ))
                  ) : (
                    <div>لا توجد مركبات غير مغطاة.</div>
                  )}
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="mb-3 font-medium">نقاط غير مغطاة بالكامل</div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {coverageItem?.uncoveredPoints?.length ? (
                    coverageItem.uncoveredPoints.slice(0, 8).map((point) => (
                      <div key={point._id} className="rounded-md bg-muted/20 px-3 py-2">
                        {point.name}
                      </div>
                    ))
                  ) : (
                    <div>كل النقاط مغطاة بالتعريفات الحالية.</div>
                  )}
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="mb-3 font-medium">تعريفات أثر الفاشلة</div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {coverageItem?.failedDefinitions?.length ? (
                    coverageItem.failedDefinitions.slice(0, 8).map((item) => (
                      <div key={item._id} className="rounded-md bg-rose-50 px-3 py-2 text-rose-700">
                        <div>{item.pointName}</div>
                        <div className="mt-1 text-xs">{item.externalSyncError || 'unknown_error'}</div>
                      </div>
                    ))
                  ) : (
                    <div>لا توجد تعريفات فاشلة.</div>
                  )}
                </div>
              </div>
            </div>

            {loading ? (
              <Loading text="جاري تحميل التعريفات..." />
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-3 text-sm">
                  <button type="button" className="text-primary hover:underline" onClick={selectAllDefinitions}>
                    {selectedDefinitionIds.length === definitions.length && definitions.length > 0 ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                  </button>
                  <div className="text-muted-foreground">
                    {definitions.length} تعريفات للمزود {providerLabels[providerTarget]}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/30 text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-right">تحديد</th>
                        <th className="px-4 py-3 text-right">المركبة</th>
                        <th className="px-4 py-3 text-right">النقطة</th>
                        <th className="px-4 py-3 text-right">النوع</th>
                        <th className="px-4 py-3 text-right">الحالة</th>
                        <th className="px-4 py-3 text-right">المزامنة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {definitions.length > 0 ? (
                        definitions.map((definition) => (
                          <tr key={definition._id} className="border-t">
                            <td className="px-4 py-3">
                              <div className="flex justify-end">
                                <Checkbox
                                  checked={selectedDefinitionIds.includes(definition._id)}
                                  onCheckedChange={() => toggleDefinitionSelection(definition._id)}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3">{getDefinitionVehicleLabel(definition)}</td>
                            <td className="px-4 py-3">{getDefinitionPointLabel(definition)}</td>
                            <td className="px-4 py-3">{eventTypeLabels[definition.eventType]}</td>
                            <td className="px-4 py-3">
                              <span
                                className={cn(
                                  'inline-flex rounded-md border px-2 py-1 text-xs font-medium',
                                  definition.isActive
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : 'border-slate-200 bg-slate-50 text-slate-600'
                                )}
                              >
                                {definition.isActive ? 'نشط' : 'معطل'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end">
                                <span className={cn('inline-flex rounded-md border px-2 py-1 text-xs font-medium', syncStatusClass(definition.externalSyncStatus))}>
                                  {syncStatusLabel(definition.externalSyncStatus)}
                                </span>
                              </div>
                              {definition.externalSyncError ? (
                                <div className="mt-1 text-xs text-rose-600">{definition.externalSyncError}</div>
                              ) : null}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                            لا توجد تعريفات حالياً لهذا المزود.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
