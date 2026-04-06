/**
 * Fix RouteScheduleVehicle indexes after schema change.
 *
 * Older DBs had a unique index on { routeId, workScheduleId } only, which blocks
 * multiple vehicles per route+work schedule. The app expects uniqueness on
 * { routeId, workScheduleId, vehicleId }.
 *
 * 1) Removes duplicate triples (keeps oldest by createdAt).
 * 2) Drops routeId_1_workScheduleId_1 if present.
 * 3) Ensures unique compound index on routeId + workScheduleId + vehicleId.
 *
 * Usage (with MONGODB_URI set):
 *   npx ts-node --project tsconfig.seed.json scripts/fix-route-schedule-vehicle-index.ts
 * Or: npm run fix:index:route-schedule-vehicles
 */

import connectDB from '../src/lib/mongodb';
import RouteScheduleVehicle from '../src/models/RouteScheduleVehicle';

async function main() {
  await connectDB();
  const coll = RouteScheduleVehicle.collection;

  const docs = await RouteScheduleVehicle.find({})
    .sort({ createdAt: 1 })
    .select('_id routeId workScheduleId vehicleId')
    .lean()
    .exec();

  const seen = new Set<string>();
  let removed = 0;
  for (const doc of docs) {
    const key = `${doc.routeId}-${doc.workScheduleId}-${doc.vehicleId}`;
    if (seen.has(key)) {
      await RouteScheduleVehicle.deleteOne({ _id: doc._id }).exec();
      removed++;
    } else {
      seen.add(key);
    }
  }
  if (removed > 0) {
    console.log(`Removed ${removed} duplicate RouteScheduleVehicle document(s).`);
  }

  let indexes = await coll.indexes();
  const names = indexes.map((i) => i.name).filter(Boolean) as string[];

  if (names.includes('routeId_1_workScheduleId_1')) {
    await coll.dropIndex('routeId_1_workScheduleId_1');
    console.log('Dropped obsolete index: routeId_1_workScheduleId_1');
    indexes = await coll.indexes();
  }

  const hasTripleUnique = indexes.some((i) => {
    const key = i.key as Record<string, unknown> | undefined;
    if (!i.unique || !key || Object.keys(key).length !== 3) return false;
    return key.routeId === 1 && key.workScheduleId === 1 && key.vehicleId === 1;
  });

  if (!hasTripleUnique) {
    await coll.createIndex(
      { routeId: 1, workScheduleId: 1, vehicleId: 1 },
      { unique: true, name: 'routeId_1_workScheduleId_1_vehicleId_1' }
    );
    console.log('Created unique index: routeId_1_workScheduleId_1_vehicleId_1');
  } else {
    console.log('Unique triple index already present; skipped createIndex.');
  }

  console.log('Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
