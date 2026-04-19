/**
 * Patch Leaflet to avoid "Cannot read properties of undefined (reading '_leaflet_events')"
 * and "_zoom" null errors when markers/layers are removed during React unmount.
 * Applied synchronously on first import (client-side) so it runs before any map unmount.
 */
import L from "leaflet";

const patchApplied = "__leaflet_events_patch_applied";
const markerClusterPatchApplied = "__leaflet_markercluster_patch_applied";

function isTeardownMapError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("getMinZoom") ||
    message.includes("getMaxZoom") ||
    message.includes("_map") ||
    message.includes("_zoom") ||
    message.includes("_mapPane")
  );
}

function wrapTeardownSafeMethod(proto: any, methodName: string, needsMap = false) {
  const original = proto?.[methodName];
  if (typeof original !== "function" || (original as any).__leafletSafeWrapped) return;

  const wrapped = function (this: any, ...args: any[]) {
    const map = this?._map ?? this?._group?._map ?? null;
    if (needsMap && !map) return this;
    try {
      return original.apply(this, args);
    } catch (error) {
      if (isTeardownMapError(error)) return this;
      throw error;
    }
  };

  (wrapped as any).__leafletSafeWrapped = true;
  proto[methodName] = wrapped;
}

function applyLeafletPatch() {
  if (typeof window === "undefined") return;
  if ((L as any)[patchApplied]) return;

  // 1) Guard Evented.off so it no-ops when _leaflet_events is missing (stale ref during unmount)
  if (L.Evented?.prototype) {
    const origOff = L.Evented.prototype.off;
    if (typeof origOff === "function") {
      L.Evented.prototype.off = function (this: any, ...args: any[]) {
        if (this == null || this._leaflet_events === undefined) return this;
        return (origOff as any).apply(this, args);
      };
    }
  }

  // 2) Guard Marker.onRemove so _removeIcon() never throws (icon DOM/events can be gone on unmount)
  if (L.Marker?.prototype?.onRemove) {
    const origOnRemove = L.Marker.prototype.onRemove;
    L.Marker.prototype.onRemove = function (this: any, map: import("leaflet").Map) {
      try {
        return (origOnRemove as any).call(this, map);
      } catch {
        // ignore _leaflet_events / removeOne errors during teardown
        return this;
      }
    };
  }

  // 3) Guard Control.onRemove (Attribution, etc.) so teardown never throws when map is null
  if (L.Control?.prototype?.onRemove) {
    const origControlOnRemove = L.Control.prototype.onRemove;
    L.Control.prototype.onRemove = function (this: any, map: import("leaflet").Map) {
      try {
        return (origControlOnRemove as any).call(this, map);
      } catch {
        // ignore errors when map is already null during teardown
        return this;
      }
    };
  }

  // 4) Guard Map.removeLayer so ANY layer removal never throws (leaflet-arrowheads / Zoom / controls can throw _zoom null when map is destroyed)
  if (L.Map?.prototype?.removeLayer) {
    const origRemoveLayer = L.Map.prototype.removeLayer;
    L.Map.prototype.removeLayer = function (this: any, layer: any) {
      try {
        return (origRemoveLayer as any).call(this, layer);
      } catch {
        // ignore _zoom null or other teardown errors when map is already destroyed
        return this;
      }
    };
  }

  (L as any)[patchApplied] = true;
}

applyLeafletPatch();

export function applyLeafletMarkerClusterPatch() {
  if (typeof window === "undefined") return;
  if ((L as any)[markerClusterPatchApplied]) return;

  const markerClusterGroup = (L as any).MarkerClusterGroup;
  if (markerClusterGroup?.prototype) {
    [
      "_moveEnd",
      "_zoomEnd",
      "_generateInitialClusters",
      "_removeFromGridUnclustered",
      "_removeLayer",
      "_hideCoverage",
      "_zoomOrSpiderfy",
      "_animationZoomIn",
      "_animationZoomOut",
      "_animationStart",
      "_animationEnd",
    ].forEach((methodName) => wrapTeardownSafeMethod(markerClusterGroup.prototype, methodName, true));

    wrapTeardownSafeMethod(markerClusterGroup.prototype, "onRemove", false);
    wrapTeardownSafeMethod(markerClusterGroup.prototype, "removeLayer", false);
    wrapTeardownSafeMethod(markerClusterGroup.prototype, "removeLayers", false);
    wrapTeardownSafeMethod(markerClusterGroup.prototype, "clearLayers", false);
  }

  const markerCluster = (L as any).MarkerCluster;
  if (markerCluster?.prototype) {
    [
      "zoomToBounds",
      "spiderfy",
      "unspiderfy",
      "_recursively",
      "_recursivelyAnimateChildrenIn",
      "_recursivelyAnimateChildrenInAndAddSelfToMap",
      "_recursivelyBecomeVisible",
      "_recursivelyAddChildrenToMap",
      "_recursivelyRemoveChildrenFromMap",
    ].forEach((methodName) => wrapTeardownSafeMethod(markerCluster.prototype, methodName, true));
  }

  (L as any)[markerClusterPatchApplied] = true;
}
