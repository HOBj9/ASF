/**
 * Repair Visit Log Script
 *
 * Creates PointVisit records for zone_out events that have a matching zone_in
 * but no corresponding visit. It also restores ZoneEvent.pointId for repaired events.
 *
 * Usage: npm run repair:visits
 * Or: npx ts-node --project tsconfig.seed.json scripts/repair-visit-log.ts
 */

import connectDB from '../src/lib/mongodb';
import Vehicle from '../src/models/Vehicle';
import ZoneEvent from '../src/models/ZoneEvent';
import PointVisit from '../src/models/PointVisit';
import PointCompletion from '../src/models/PointCompletion';
import Branch from '../src/models/Branch';
import { getZonedDateString } from '../src/lib/utils/timezone.util';
import {
  buildZoneEventPointMatchers,
  extractNumericZoneId,
  resolveAtharPoint,
} from '../src/lib/utils/athar-point.util';

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? (value as Record<string, any>) : {};
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    if (typeof value !== 'string') continue;
    const cleaned = value.trim();
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    output.push(cleaned);
  }

  return output;
}

function getZoneEventMetadata(zoneEvent: any): {
  zoneName: string | null;
  desc: string | null;
} {
  const rawPayload = asObject(zoneEvent?.rawPayload);
  const queryPayload = asObject(rawPayload.query);
  const bodyPayload = asObject(rawPayload.body);

  const zoneName =
    bodyPayload.zone_name ||
    bodyPayload.zoneName ||
    queryPayload.zone_name ||
    queryPayload.zoneName ||
    rawPayload.zone_name ||
    rawPayload.zoneName ||
    null;
  const desc = bodyPayload.desc || queryPayload.desc || rawPayload.desc || null;

  return { zoneName, desc };
}

async function repair() {
  await connectDB();
  console.log('Connected to MongoDB. Repairing visit log...');

  const allExits = await ZoneEvent.find({ type: 'zone_out' })
    .sort({ eventTimestamp: 1 })
    .lean();
  const usedExitIds = await PointVisit.find({ exitEventId: { $ne: null } })
    .distinct('exitEventId')
    .then((ids) => new Set(ids.map((id) => String(id))));
  const orphanExits = allExits.filter((event) => !usedExitIds.has(String(event._id)));

  console.log(`Found ${orphanExits.length} zone_out events without visit (of ${allExits.length} total)`);

  let repaired = 0;
  let skipped = 0;
  const skipReasons: Record<string, number> = {};

  for (const exitEv of orphanExits) {
    const branchId = String(exitEv.branchId);
    const { zoneName, desc } = getZoneEventMetadata(exitEv);
    const zoneIdsToMatch = uniqueStrings([
      exitEv.zoneId ?? null,
      extractNumericZoneId(exitEv.zoneId ?? null),
      extractNumericZoneId(zoneName),
      extractNumericZoneId(desc),
    ]);

    const vehicleId = exitEv.vehicleId || null;
    const imei = exitEv.imei || null;

    if (!vehicleId && !imei) {
      skipReasons.no_vehicle_or_imei = (skipReasons.no_vehicle_or_imei || 0) + 1;
      skipped++;
      continue;
    }

    let vehicle = vehicleId ? await Vehicle.findById(vehicleId).lean() : null;
    if (!vehicle && imei) {
      vehicle = (await Vehicle.findOne({ branchId, imei }).lean()) ?? (await Vehicle.findOne({ imei }).lean());
    }

    if (!vehicle) {
      const unknownImei = `repair-unknown-${branchId}`;
      const unknownVehicle = await Vehicle.findOne({ branchId, imei: unknownImei }).lean();
      if (unknownVehicle) {
        vehicle = unknownVehicle;
      } else {
        const created = await Vehicle.create({
          branchId,
          name: 'مركبة غير معروفة (أثر)',
          imei: unknownImei,
          isActive: true,
        });
        vehicle = await Vehicle.findById(created._id).lean();
      }
    }

    if (!vehicle) {
      skipReasons.vehicle_not_found = (skipReasons.vehicle_not_found || 0) + 1;
      skipped++;
      continue;
    }

    const point = await resolveAtharPoint({
      branchId,
      zoneIdRaw: exitEv.zoneId ?? null,
      zoneIdNormalized: exitEv.zoneId ?? null,
      zoneName,
      desc,
      eventName: exitEv.name ?? null,
    });

    if (!point) {
      skipReasons.point_not_found = (skipReasons.point_not_found || 0) + 1;
      skipped++;
      continue;
    }

    const exitTime = new Date(exitEv.eventTimestamp!);
    const vehicleOrImei =
      imei && String(imei).trim()
        ? [{ vehicleId: vehicle._id }, { imei: String(imei).trim() }]
        : [{ vehicleId: vehicle._id }];
    const pointMatchers = buildZoneEventPointMatchers(point);
    if (zoneIdsToMatch.length > 0) {
      pointMatchers.push({ zoneId: { $in: zoneIdsToMatch } });
    }

    const matchingEntry = await ZoneEvent.findOne({
      branchId,
      $and: [{ $or: vehicleOrImei }, { $or: pointMatchers }],
      type: 'zone_in',
      eventTimestamp: { $lt: exitTime },
      _id: { $ne: exitEv._id },
    })
      .sort({ eventTimestamp: -1 })
      .lean();

    if (!matchingEntry) {
      skipReasons.no_matching_entry = (skipReasons.no_matching_entry || 0) + 1;
      skipped++;
      continue;
    }

    const alreadyUsed = await PointVisit.exists({ entryEventId: matchingEntry._id });
    if (alreadyUsed) {
      skipReasons.entry_already_used = (skipReasons.entry_already_used || 0) + 1;
      skipped++;
      continue;
    }

    const entryTime = new Date(matchingEntry.eventTimestamp!);
    const durationSeconds = Math.max(0, Math.floor((exitTime.getTime() - entryTime.getTime()) / 1000));
    const canonicalZoneId = point.zoneId || exitEv.zoneId || null;

    const newVisit = await PointVisit.create({
      branchId,
      vehicleId: vehicle._id,
      pointId: point._id,
      zoneId: canonicalZoneId,
      entryEventId: matchingEntry._id,
      exitEventId: exitEv._id,
      entryTime,
      exitTime,
      durationSeconds,
      status: 'closed',
    });

    const branch = await Branch.findById(branchId).select('timezone').lean();
    const timeZone = branch?.timezone || 'Asia/Riyadh';
    const completionDate = getZonedDateString(timeZone, exitTime);
    const existingCompletion = await PointCompletion.findOne({
      branchId,
      pointId: point._id,
      completionDate,
    }).lean();

    if (!existingCompletion) {
      await PointCompletion.create({
        branchId,
        pointId: point._id,
        completionDate,
        pointVisitId: newVisit._id,
        completedAt: exitTime,
      });
      await PointVisit.findByIdAndUpdate(newVisit._id, { visitKind: 'first' });
    } else {
      await PointVisit.findByIdAndUpdate(newVisit._id, { visitKind: 'repeated' });
    }

    await ZoneEvent.updateMany(
      { _id: { $in: [exitEv._id, matchingEntry._id] } },
      {
        $set: {
          pointId: point._id,
          zoneId: canonicalZoneId,
          isOrphanExit: false,
        },
      }
    );

    repaired++;
    console.log(
      `Repaired: point=${point.nameAr || point.name}, vehicle=${vehicle.name}, exit=${exitTime.toISOString()}`
    );
  }

  console.log(`Done. Repaired: ${repaired}, Skipped: ${skipped}`);
  if (Object.keys(skipReasons).length > 0) {
    console.log('Skip reasons:', JSON.stringify(skipReasons, null, 2));
  }

  const unknownVehicles = await Vehicle.find({ imei: { $regex: /^repair-unknown-/ } })
    .select('_id branchId')
    .lean();
  const unknownVehicleIds = new Set(unknownVehicles.map((vehicle) => String(vehicle._id)));

  const visitsWithUnknownVehicle = await PointVisit.find({
    vehicleId: { $in: Array.from(unknownVehicleIds) },
    $or: [{ entryEventId: { $ne: null } }, { exitEventId: { $ne: null } }],
  }).lean();

  let vehicleUpdates = 0;
  for (const visit of visitsWithUnknownVehicle) {
    const eventId = visit.entryEventId || visit.exitEventId;
    if (!eventId) continue;

    const zoneEv = await ZoneEvent.findById(eventId).select('imei branchId').lean();
    if (!zoneEv?.imei) continue;

    const realVehicle = await Vehicle.findOne({
      branchId: visit.branchId,
      imei: zoneEv.imei.trim(),
    })
      .select('_id name')
      .lean();
    if (!realVehicle) continue;

    await PointVisit.findByIdAndUpdate(visit._id, { vehicleId: realVehicle._id });
    vehicleUpdates++;
    console.log(`Updated vehicle: visit ${visit._id} -> ${realVehicle.name}`);
  }

  if (vehicleUpdates > 0) {
    console.log(`Vehicle updates: ${vehicleUpdates} visits now use correct vehicle`);
  }

  process.exit(0);
}

repair().catch((err) => {
  console.error('Repair failed:', err);
  process.exit(1);
});
