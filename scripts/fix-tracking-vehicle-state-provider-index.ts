/**
 * Fix TrackingVehicleState indexes after splitting state by provider.
 *
 * Older DBs had a unique index on { vehicleId } only, which prevents keeping
 * separate live state rows for Athar and mobile GPS for the same vehicle. The
 * app now expects uniqueness on { vehicleId, provider }.
 *
 * This script does not delete tracking data. It only verifies that the new
 * unique key has no conflicts, drops the obsolete unique index if present, and
 * ensures the new compound unique index exists.
 *
 * Usage (with MONGODB_URI set):
 *   npx ts-node --project tsconfig.seed.json scripts/fix-tracking-vehicle-state-provider-index.ts
 * Or: npm run fix:index:tracking-vehicle-state-provider
 */

import connectDB from '../src/lib/mongodb';
import TrackingVehicleState from '../src/models/TrackingVehicleState';

async function main() {
  await connectDB();
  const coll = TrackingVehicleState.collection;

  const duplicateProviderStates = await TrackingVehicleState.aggregate([
    {
      $group: {
        _id: { vehicleId: '$vehicleId', provider: '$provider' },
        count: { $sum: 1 },
        ids: { $push: '$_id' },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $limit: 10 },
  ]);

  if (duplicateProviderStates.length > 0) {
    console.error(
      'Cannot create unique { vehicleId, provider } index because duplicate state rows exist.'
    );
    console.error(JSON.stringify(duplicateProviderStates, null, 2));
    process.exit(1);
  }

  let indexes = await coll.indexes();
  const obsoleteVehicleOnlyUnique = indexes.find((index) => {
    const key = index.key as Record<string, unknown> | undefined;
    return (
      index.unique === true &&
      key &&
      Object.keys(key).length === 1 &&
      key.vehicleId === 1
    );
  });

  if (obsoleteVehicleOnlyUnique?.name) {
    await coll.dropIndex(obsoleteVehicleOnlyUnique.name);
    console.log(`Dropped obsolete unique index: ${obsoleteVehicleOnlyUnique.name}`);
    indexes = await coll.indexes();
  }

  const hasProviderUnique = indexes.some((index) => {
    const key = index.key as Record<string, unknown> | undefined;
    return (
      index.unique === true &&
      key &&
      Object.keys(key).length === 2 &&
      key.vehicleId === 1 &&
      key.provider === 1
    );
  });

  if (!hasProviderUnique) {
    await coll.createIndex(
      { vehicleId: 1, provider: 1 },
      { unique: true, name: 'vehicleId_1_provider_1' }
    );
    console.log('Created unique index: vehicleId_1_provider_1');
  } else {
    console.log('Unique provider state index already present; skipped createIndex.');
  }

  console.log('Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
