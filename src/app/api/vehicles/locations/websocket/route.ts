import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/middleware/api-auth.middleware';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { LiveTrackingService } from '@/lib/services/live-tracking.service';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { getCachedVehicleSnapshot } from '@/lib/live/branch-live-snapshot-cache';

const liveTrackingService = new LiveTrackingService();
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authResult = await requirePermission(permissionResources.VEHICLES, permissionActions.READ);
  if (authResult instanceof NextResponse) return authResult;

  const { session } = authResult;
  const { searchParams } = new URL(request.url);
  const branchId = resolveBranchId(session, searchParams.get('branchId'));

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let isClosed = false;
      let intervalId: ReturnType<typeof setInterval> | null = null;

      const send = async () => {
        if (isClosed) return;
        try {
          const locations = await getCachedVehicleSnapshot(branchId, () =>
            liveTrackingService.getBranchVehicleLocations(branchId),
          );
          const payload = {
            type: 'bus_locations',
            data: locations,
            timestamp: new Date().toISOString(),
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch (error) {
          const payload = {
            type: 'bus_locations',
            data: [],
            timestamp: new Date().toISOString(),
            status: 'error',
            message: error instanceof Error ? error.message : 'خطأ أثناء جلب التتبع الحي',
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        }
      };

      void send();
      intervalId = setInterval(() => {
        void send();
      }, 3000);

      request.signal.addEventListener('abort', () => {
        isClosed = true;
        if (intervalId) clearInterval(intervalId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
