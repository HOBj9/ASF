/**
 * Patch Leaflet to avoid "Cannot read properties of undefined (reading '_leaflet_events')"
 * and "_zoom" null errors when markers/layers are removed during React unmount.
 * Applied synchronously on first import (client-side) so it runs before any map unmount.
 */
import L from "leaflet";

const patchApplied = "__leaflet_events_patch_applied";

function applyLeafletPatch() {
  if (typeof window === "undefined") return;
  if ((L as any)[patchApplied]) return;

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
    L.Marker.prototype.onRemove = function (this: any, map: import("leaflet").Map) {
      try {
        origOnRemove.call(this, map);
      } catch {
        // ignore _leaflet_events / removeOne errors during teardown
      }
    };
  }

  // 3) Guard Control.onRemove (Attribution, etc.) so teardown never throws when map is null
  if (L.Control?.prototype?.onRemove) {
    const origControlOnRemove = L.Control.prototype.onRemove;
    L.Control.prototype.onRemove = function (this: any, map: import("leaflet").Map) {
      try {
        origControlOnRemove.call(this, map);
      } catch {
        // ignore errors when map is already null during teardown
      }
    };
  }

  // 4) Guard Map.removeLayer so ANY layer removal never throws (leaflet-arrowheads / Zoom / controls can throw _zoom null when map is destroyed)
  if (L.Map?.prototype?.removeLayer) {
    const origRemoveLayer = L.Map.prototype.removeLayer;
    L.Map.prototype.removeLayer = function (this: any, layer: any) {
      try {
        origRemoveLayer.call(this, layer);
      } catch {
        // ignore _zoom null or other teardown errors when map is already destroyed
      }
    };
  }

  (L as any)[patchApplied] = true;
}

applyLeafletPatch();
