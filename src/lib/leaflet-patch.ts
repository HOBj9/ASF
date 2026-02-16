/**
 * Patch Leaflet to avoid "Cannot read properties of undefined (reading '_leaflet_events')"
 * when markers/layers are removed during React unmount (e.g. MapContainer unmounts before
 * child Marker cleanups run, or icon refs are already cleared).
 * Import this once from any component that uses Leaflet (e.g. map-picker, municipality-map).
 */
import L from "leaflet";

const patchApplied = "__leaflet_events_patch_applied";

if (typeof L !== "undefined" && !(L as any)[patchApplied]) {
  // 1) Guard Evented.off so it no-ops when _leaflet_events is missing (stale ref during unmount)
  if (L.Evented?.prototype) {
    const origOff = L.Evented.prototype.off;
    if (typeof origOff === "function") {
      L.Evented.prototype.off = function (this: any, ...args: any[]) {
        if (this == null || this._leaflet_events === undefined) return this;
        return origOff.apply(this, args);
      };
    }
  }

  // 2) Guard Marker.onRemove so _removeIcon() never throws (icon DOM/events can be gone on unmount)
  if (L.Marker?.prototype?.onRemove) {
    const origOnRemove = L.Marker.prototype.onRemove;
    L.Marker.prototype.onRemove = function (this: any, map: L.Map) {
      try {
        origOnRemove.call(this, map);
      } catch {
        // ignore _leaflet_events / removeOne errors during teardown
      }
    };
  }

  (L as any)[patchApplied] = true;
}
