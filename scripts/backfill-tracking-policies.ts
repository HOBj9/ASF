import connectDB from "../src/lib/mongodb";
import Vehicle from "../src/models/Vehicle";
import "../src/models";

async function run() {
  await connectDB();

  const vehicles = await Vehicle.find({})
    .select("_id trackingProvider acceptedTrackingProviders zoneEventProvider")
    .lean();

  let updated = 0;

  for (const vehicle of vehicles as any[]) {
    const trackingProvider =
      vehicle?.trackingProvider === "mobile_app" || vehicle?.trackingProvider === "traccar"
        ? vehicle.trackingProvider
        : "athar";

    const acceptedTrackingProviders =
      Array.isArray(vehicle?.acceptedTrackingProviders) && vehicle.acceptedTrackingProviders.length > 0
        ? vehicle.acceptedTrackingProviders
        : [trackingProvider];

    const zoneEventProvider =
      vehicle?.zoneEventProvider === "mobile_app" || vehicle?.zoneEventProvider === "athar"
        ? vehicle.zoneEventProvider
        : trackingProvider === "mobile_app"
          ? "mobile_app"
          : "athar";

    const needsUpdate =
      !Array.isArray(vehicle?.acceptedTrackingProviders) ||
      vehicle.acceptedTrackingProviders.length === 0 ||
      !vehicle?.zoneEventProvider;

    if (!needsUpdate) {
      continue;
    }

    await Vehicle.findByIdAndUpdate(vehicle._id, {
      $set: {
        acceptedTrackingProviders,
        zoneEventProvider,
      },
    }).exec();
    updated += 1;
  }

  console.log(`Backfilled tracking policies for ${updated} vehicles.`);
  process.exit(0);
}

run().catch((error) => {
  console.error("Backfill failed:", error);
  process.exit(1);
});
