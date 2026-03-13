import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/middleware/api-auth.middleware';
import { resolveBranchId } from '@/lib/utils/municipality.util';
import { permissionActions, permissionResources } from '@/constants/permissions';
import { subscribeToZoneEventUpdates } from '@/lib/services/zone-event-stream-bus.service';
import { getBranchTimezone, getRecentBranchEvents } from '@/lib/services/zone-event-feed.service';
import { getCachedEventSnapshot } from '@/lib/live/branch-live-snapshot-cache';

export const dynamic = 'force-dynamic';

function parseLimit(input: string | null): number {
  const numeric = Number(input || 10);
  if (!Number.isFinite(numeric)) return 10;
  return Math.min(Math.max(Math.floor(numeric), 1), 50);
}

export async function GET(request: Request) {
  const authResult = await requirePermission(permissionResources.EVENTS, permissionActions.READ);
  if (authResult instanceof NextResponse) return authResult;

  const { session } = authResult;
  const { searchParams } = new URL(request.url);
  const branchId = resolveBranchId(session, searchParams.get('branchId'));
  const limit = parseLimit(searchParams.get('limit'));
  const timezone = await getBranchTimezone(branchId);

  if (!timezone) {
    return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let isClosed = false;
      let heartbeatId: ReturnType<typeof setInterval> | null = null;
      let resyncId: ReturnType<typeof setInterval> | null = null;

      const sendPayload = (payload: Record<string, any>) => {
        if (isClosed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      const sendSnapshot = async () => {
        try {
          const events = await getCachedEventSnapshot(branchId, limit, 0, () =>
            getRecentBranchEvents(branchId, limit, timezone, 0),
          );
          sendPayload({
            type: 'events_snapshot',
            data: events,
            timestamp: new Date().toISOString(),
          });
        } catch (error: any) {
          sendPayload({
            type: 'events_snapshot',
            data: [],
            status: 'error',
            message: error?.message || 'فشل جلب الأحداث',
            timestamp: new Date().toISOString(),
          });
        }
      };

      const unsubscribe = subscribeToZoneEventUpdates(branchId, (event) => {
        sendPayload({
          type: 'zone_event',
          data: event,
          timestamp: new Date().toISOString(),
        });
      });

      void sendSnapshot();

      heartbeatId = setInterval(() => {
        sendPayload({
          type: 'heartbeat',
          timestamp: new Date().toISOString(),
        });
      }, 15000);

      resyncId = setInterval(() => {
        void sendSnapshot();
      }, 30000);

      request.signal.addEventListener('abort', () => {
        isClosed = true;
        unsubscribe();
        if (heartbeatId) clearInterval(heartbeatId);
        if (resyncId) clearInterval(resyncId);
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
