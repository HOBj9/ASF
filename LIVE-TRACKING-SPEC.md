# Live Bus Tracking — Technical Specification

This document describes the **live bus tracking** flow in a **programmatic, implementation-ready** way so it can be reused in another system. It covers: data contracts, Athar integration, REST/SSE APIs, and frontend map contract.

---

## 1. Purpose and Scope

**Goal:** Show buses belonging to an institution on a map with real-time positions and status (moving / stopped / offline), using GPS data from **Athar**.

**Out of scope:** Zone/geofence events, notifications, trip schedules. Only **location fetch + map display** are specified here.

---

## 2. Prerequisites

| Requirement | Description |
|-------------|-------------|
| **Auth** | User must be authenticated (e.g. JWT). Token must allow resolving an **institution ID** (e.g. `decoded.institutionId` or `User.institutionId`). |
| **Database** | Table **Bus**: at least `id`, `institutionId`, `imei` (nullable). Optional: `busName`, `busPlateNumber`, `driverPhoneNumber`, `numberOfSeats`. Table **Institution**: at least `id`, `atharKey` (nullable). |
| **Athar** | External API that accepts GET requests with query params `api`, `ver`, `key`, `cmd`. Command used: `OBJECT_GET_LOCATIONS,{imei1;imei2;...}`. |
| **Config** | `ATHAR_BASE_URL`, `ATHAR_API` (or `ATHAR_API_TYPE`), `ATHAR_VERSION`, optional `ATHAR_API_KEY` / `ATHAR_API_KEY1` as fallback when institution has no `atharKey`. |

---

## 3. Data Contracts

### 3.1 Bus location item (for map and list)

This is the **canonical shape** your frontend map and list should consume. Both REST and SSE should return this shape (see §5 and §6).

```ts
interface BusLocationItem {
  id: string;                    // Bus primary key (e.g. cuid)
  busNumber: string;              // Display: plate or name or "حافلة XXXX"
  driverName: string;
  route: string;                  // e.g. "غير محدد"
  status: "moving" | "stopped" | "offline";
  lastUpdate: string;             // e.g. "منذ لحظات" or "غير متصل"
  passengers: number;
  capacity: number;
  speed: number;
  coordinates: [number, number] | null;  // [lat, lng] for Leaflet; null if offline
  imei?: string;
  engineStatus?: boolean;        // true = ignition on (moving), false = off (stopped) or unknown
}
```

**Rules:**

- `coordinates`: `[latitude, longitude]` in **WGS84**. Order ** [lat, lng] ** (Leaflet convention). Use `null` when Athar returns no position for that IMEI.
- `status`:
  - `"moving"`: Athar returned location and `params.acc === "1"`.
  - `"stopped"`: Athar returned location and `params.acc !== "1"`.
  - `"offline"`: Athar did not return location for this IMEI (or request failed).

### 3.2 REST API response

```ts
interface LocationsApiResponse {
  data: BusLocationItem[] | null;
  status: "success" | "error";
  message?: string;
}
```

### 3.3 SSE event payload

Each Server-Sent Event carries a JSON string in the `data` field. **Recommended** shape (same as REST so frontend can use one type):

```ts
interface SSELocationsPayload {
  type: "bus_locations";
  data: BusLocationItem[];
  timestamp: string;  // ISO 8601
}
```

Frontend parses `event.data` as JSON and uses `payload.data` as the list of buses.

---

## 4. Athar Integration (Backend)

### 4.1 Resolve API key

```text
1. Get institutionId from the authenticated user (e.g. decoded.institutionId or user.institutionId).
2. Load institution from DB: Institution.findOne({ where: { id: institutionId } }).
3. atharKey = institution.atharKey
4. If atharKey is null/empty:
   - atharKey = env.ATHAR_API_KEY || env.ATHAR_API_KEY1
   - If still null, return 400 "Athar key not configured for this institution".
5. Use atharKey for all Athar requests below.
```

### 4.2 Athar request: batch locations + engine status

**Method:** GET  
**URL:** `{ATHAR_BASE_URL}` (e.g. `https://admin.alather.net/api/api.php`)

**Query parameters:**

| Parameter | Value |
|-----------|--------|
| `api` | `process.env.ATHAR_API \|\| "user"` |
| `ver` | `process.env.ATHAR_VERSION \|\| "1.0"` |
| `key` | `atharKey` (from §4.1) |
| `cmd` | `OBJECT_GET_LOCATIONS,{imei1;imei2;imei3;...}` (semicolon-separated list of IMEIs, no spaces) |

**Example:**  
`GET https://admin.alather.net/api/api.php?api=user&ver=1.0&key=YOUR_KEY&cmd=OBJECT_GET_LOCATIONS,123456789012345;987654321098765`

**Response (JSON):** Object keyed by IMEI. Each value:

```ts
{
  lat: number,
  lng: number,
  params?: { acc?: string }   // "1" = engine on, else off
}
```

If an IMEI has no data, it may be missing from the object.

### 4.3 Parse Athar response into a list

```text
Input: atharResponse (object), imeis (string[])

For each imei in imeis:
  info = atharResponse[imei]
  If info exists and (info.lat != null and info.lng != null):
    lat = parseFloat(info.lat)
    lng = parseFloat(info.lng)
    engineStatus = (info.params?.acc === "1")
    Append { imei, lat, lng, engine_status: engineStatus } to result
  Else:
    Append { imei, lat: null, lng: null, engine_status: false } to result

Return result  // Array<{ imei, lat, lng, engine_status }>
```

You will merge this list with your Bus records to build `BusLocationItem[]` (§5.2).

---

## 5. Backend: REST Endpoint

### 5.1 Specification

- **Method:** GET  
- **Path:** e.g. `/api/buses/locations`  
- **Headers:** `Authorization: Bearer <JWT>`

### 5.2 Algorithm (step-by-step)

```text
1. Extract token from header: Authorization.replace("Bearer ", "").
2. If no token, return 401 { data: null, status: "error", message: "Unauthorized" }.
3. Decode and verify JWT; get user/institution:
   - If JWT invalid or expired, return 401.
   - Resolve institutionId (e.g. from decoded.institutionId or by loading User by decoded.userId and reading User.institutionId).
4. Resolve Athar key (§4.1). If none, return 400 { data: null, status: "error", message: "Athar key not configured for this institution" }.
5. Load buses from DB:
   buses = Bus.findMany({ where: { institutionId, imei: { not: null } } })
   Optionally include: supervisors, etc.
6. If buses.length === 0:
   Return 200 { data: [], status: "success", message: "..." }.
7. Build IMEI list: imeis = buses.map(b => b.imei).filter(Boolean).
8. Call Athar (§4.2): response = GET ATHAR_BASE_URL?api=...&ver=...&key=...&cmd=OBJECT_GET_LOCATIONS,{imeis.join(";")}.
9. Parse response (§4.3): atharList = parseAtharResponse(response, imeis).
10. Build lookup: atharByImei = Map(atharList, item => [item.imei, item]).
11. Build busLocations = []:
    For each bus in buses:
      info = atharByImei.get(bus.imei)
      If info and info.lat != null and info.lng != null:
        status = info.engine_status ? "moving" : "stopped"
        Append BusLocationItem {
          id: bus.id,
          busNumber: bus.busPlateNumber || bus.busName || `حافلة ${bus.id.slice(-4)}`,
          driverName: bus.driverPhoneNumber || bus.busName || "غير محدد",
          route: "غير محدد",
          status,
          lastUpdate: "منذ لحظات",
          passengers: 0,
          capacity: bus.numberOfSeats ?? 40,
          speed: 0,
          coordinates: [parseFloat(info.lat), parseFloat(info.lng)],
          imei: bus.imei,
          engineStatus: info.engine_status
        }
      Else:
        Append BusLocationItem {
          id: bus.id,
          busNumber: ...,
          driverName: ...,
          route: "غير محدد",
          status: "offline",
          lastUpdate: "غير متصل",
          passengers: 0,
          capacity: bus.numberOfSeats ?? 40,
          speed: 0,
          coordinates: null,
          imei: bus.imei,
          engineStatus: false
        }
12. Return 200 { data: busLocations, status: "success", message: "..." }.
```

**Error handling:** On unexpected errors (e.g. Athar timeout), log and return 500 { data: null, status: "error", message: "Internal server error" }.

---

## 6. Backend: SSE Stream (real-time updates)

### 6.1 Specification

- **Method:** GET  
- **Path:** e.g. `/api/buses/locations/websocket`  
- **Query:** `token=<JWT>` (auth via query to support EventSource, which does not send custom headers)

### 6.2 Algorithm (step-by-step)

```text
1. Read token from query: url.searchParams.get("token").
2. If no token, return 401 JSON { error: "Token is required" }.
3. Verify JWT and resolve institutionId (same as REST §5.2 steps 3–4). On failure, return 401/403.
4. Create a ReadableStream (Server-Sent Events):
   - Headers: Content-Type: text/event-stream, Cache-Control: no-cache, Connection: keep-alive.
   - Body: stream of SSE events.

5. Stream behavior:
   - On stream start:
     a. isClosed = false, interval = null.
     b. Define sendUpdate():
          - If isClosed, return.
          - Fetch bus locations for institutionId (same logic as REST §5.2 steps 4–11: get atharKey, load buses, call Athar, build BusLocationItem[]). Use the SAME shape as REST (§3.1).
          - Payload = { type: "bus_locations", data: busLocations, timestamp: new Date().toISOString() }.
          - If !isClosed: enqueue "data: " + JSON.stringify(payload) + "\n\n".
          - On error: log; do not close stream (skip this tick).
     c. Call sendUpdate() once (initial payload).
     d. interval = setInterval(sendUpdate, 5000).  // Every 5 seconds
     e. On request.signal.abort (client disconnect):
          isClosed = true; clearInterval(interval); close stream.
```

**Important:** The payload `data` must be an array of `BusLocationItem` (§3.1) with `id` and `coordinates: [lat, lng] | null`, so the frontend can use the same type for both REST and SSE.

### 6.3 SSE event format

Each event is a single line (or multiple lines) of text. Standard SSE:

```text
data: {"type":"bus_locations","data":[...],"timestamp":"2025-02-03T12:00:00.000Z"}

```

The client reads `event.data` and parses it as JSON to get `BusLocationItem[]` from `payload.data`.

---

## 7. Frontend: Tracking Page (state and data flow)

### 7.1 State

- `buses: BusLocationItem[]` — list to show in list and map.
- `selectedBus: string | null` — bus id when user selects a bus (e.g. highlight in list, pan map).
- `loading: boolean` — initial load or refresh in progress.
- `error: string | null` — message to show on failure.
- `lastUpdate: string` — last time data was updated (for display).
- `isConnected: boolean` — true when SSE is connected (optional; show “تحديث كل 5 ثوان”).
- `showOfflineBuses: boolean` — filter: show/hide offline buses in list and map.
- `mapLayers: { traffic, satellite, terrain }` — which map layer is active (optional).

### 7.2 Initial load

```text
1. On mount (after auth is ready):
   - If no token/user: set error "يرجى تسجيل الدخول..."; setLoading(false); return.
   - Call fetchInitialData():
     - GET /api/buses/locations with header Authorization: Bearer <token>.
     - On 200 and response.status === "success" and response.data != null:
         setBuses(response.data), setLastUpdate(now), setError(null).
     - Else: setError(response.message or status-specific message), setBuses([]).
   - Then open SSE (see §7.3).
```

### 7.3 Real-time updates (SSE)

```text
1. url = "/api/buses/locations/websocket?token=" + encodeURIComponent(token)
2. eventSource = new EventSource(url)
3. eventSource.onopen:
   - setLoading(false), setIsConnected(true)
4. eventSource.onmessage = (event) => {
     payload = JSON.parse(event.data)
     If payload.status === "connected": setIsConnected(true)
     Else if payload.status === "success" && payload.data != null:
       setBuses(payload.data)   // Must be BusLocationItem[]
       setLastUpdate(now)
       setError(null)
     Else if payload.status === "error":
       setError(payload.message)
       setBuses([])
   }
5. eventSource.onerror:
   - setIsConnected(false), setLoading(false)
   - Optionally: retry N times with backoff, then fall back to polling (e.g. setInterval(fetchInitialData, 10000))
6. On unmount: eventSource.close()
```

**Note:** If your SSE payload uses a different structure (e.g. `payload.data` is not `BusLocationItem[]`), normalize it before `setBuses` so the map always receives the contract in §3.1.

### 7.4 Manual refresh

- Button click: call `fetchInitialData()` again (same as §7.2). Optionally set `loading` true until response.

### 7.5 Filter for map and list

- `filteredBuses = buses.filter(bus => showOfflineBuses || bus.status !== "offline")`
- Pass `filteredBuses` to the map and to the bus list.  
- **Map:** Only buses with `coordinates != null` should be drawn as markers; buses with `coordinates === null` can be omitted or shown with a default/fallback position depending on UX.

---

## 8. Frontend: Map Component Contract

### 8.1 Props

```ts
interface LiveTrackingMapProps {
  buses: BusLocationItem[];       // Only buses with coordinates != null should be drawn as markers
  selectedBus: string | null;     // id of selected bus
  onBusSelect: (busId: string | null) => void;
  mapLayers?: {
    traffic: boolean;
    satellite: boolean;
    terrain: boolean;
  };
}
```

### 8.2 Behavior

1. **Map:** One map instance (e.g. Leaflet). Center and zoom can be fixed (e.g. city) or derived from bounds of markers.
2. **Markers:** For each `bus` in `buses` where `bus.coordinates != null`:
   - Add a marker at `bus.coordinates` ([lat, lng]).
   - Icon color by `bus.status`: moving = green, stopped = yellow, offline = red.
   - On marker click: call `onBusSelect(bus.id)`.
3. **Selection:** When `selectedBus` changes, pan map to the selected bus’s `coordinates` (do not change zoom if desired).
4. **Controls (optional):** “Reset view” (e.g. city center), “Fit all buses” (fitBounds to all markers).

### 8.3 Coordinate system

- **Input:** `coordinates: [latitude, longitude]` in **WGS84** (e.g. from Athar).
- **Leaflet:** Use `[lat, lng]` in this order. Do not swap.

---

## 9. Implementation Checklist (for another system)

Use this as a short checklist when porting the feature.

**Backend**

- [ ] Resolve institution from JWT (or session).
- [ ] Resolve Athar key: institution.atharKey or env fallback; return 400 if none.
- [ ] Load buses: `institutionId` + `imei` not null.
- [ ] Athar: GET with `cmd=OBJECT_GET_LOCATIONS,{imei1;imei2;...}`, parse JSON by IMEI.
- [ ] Derive `status` from `params.acc` and presence of lat/lng; build `BusLocationItem[]` with `id`, `coordinates: [lat, lng] | null`.
- [ ] REST: GET `/api/buses/locations`, Bearer token, return `{ data: busLocations, status: "success" }`.
- [ ] SSE: GET `/api/buses/locations/websocket?token=...`, stream SSE every 5s with **same** `BusLocationItem[]` shape.

**Frontend**

- [ ] Initial load: GET locations with Bearer token; set state `buses`.
- [ ] SSE: EventSource to websocket URL; on message, parse JSON and set `buses` from `payload.data` (normalize to §3.1 if needed).
- [ ] Map: accept `buses`, `selectedBus`, `onBusSelect`; render markers only for `bus.coordinates != null`; [lat, lng] order.
- [ ] Optional: filter offline buses for display; manual refresh button; connection status.

**Config**

- [ ] `ATHAR_BASE_URL`, `ATHAR_API`, `ATHAR_VERSION`, optional `ATHAR_API_KEY` / `ATHAR_API_KEY1`.

---

## 10. Summary

| Layer | Responsibility |
|-------|----------------|
| **Athar** | Returns current lat/lng and ACC (engine) per IMEI for a batch of IMEIs. |
| **Backend REST** | Auth → institution → Athar key → buses from DB → one Athar batch call → map response to `BusLocationItem[]` with `id`, `coordinates`, `status`. |
| **Backend SSE** | Same data logic as REST; stream SSE every 5s with the **same** `BusLocationItem[]` shape. |
| **Frontend** | Initial load (REST) + live updates (SSE); state `buses`; map receives buses and draws markers for items with `coordinates != null`; coordinates as [lat, lng] WGS84. |

Keeping the **single data contract** (§3.1) for both REST and SSE ensures the same code can drive the list and map in any system that reuses this spec.

---

## 11. Code Snippets (Reference)

These snippets are **language-agnostic in logic**; adapt to your stack (Node/Next, PHP, etc.).

### 11.1 Build Athar URL and fetch (GET)

```text
baseUrl = env.ATHAR_BASE_URL   // e.g. "https://admin.alather.net/api/api.php"
api     = env.ATHAR_API        // e.g. "user"
ver     = env.ATHAR_VERSION    // e.g. "1.0"
key     = atharKey             // from institution or env fallback
imeis   = ["123456789012345", "987654321098765"]   // from your Bus table
cmd     = "OBJECT_GET_LOCATIONS," + imeis.join(";")

url = baseUrl + "?api=" + encodeURIComponent(api)
           + "&ver=" + encodeURIComponent(ver)
           + "&key=" + encodeURIComponent(key)
           + "&cmd=" + encodeURIComponent(cmd)

response = GET(url)   // HTTP GET, Accept: application/json
data     = response.json()   // object keyed by IMEI
```

### 11.2 Parse Athar response into list

```text
// data = { "123456789012345": { lat: 33.5, lng: 36.2, params: { acc: "1" } }, ... }
result = []
for each imei in imeis:
  info = data[imei]
  if info and info.lat != null and info.lng != null:
    result.push({
      imei,
      lat: parseFloat(info.lat),
      lng: parseFloat(info.lng),
      engine_status: (info.params && info.params.acc === "1")
    })
  else:
    result.push({ imei, lat: null, lng: null, engine_status: false })
return result
```

### 11.3 Build one BusLocationItem from Bus + Athar info

```text
function toBusLocationItem(bus, atharInfo):
  if atharInfo and atharInfo.lat != null and atharInfo.lng != null:
    status = atharInfo.engine_status ? "moving" : "stopped"
    return {
      id: bus.id,
      busNumber: bus.busPlateNumber || bus.busName || "حافلة " + bus.id.slice(-4),
      driverName: bus.driverPhoneNumber || bus.busName || "غير محدد",
      route: "غير محدد",
      status,
      lastUpdate: "منذ لحظات",
      passengers: 0,
      capacity: bus.numberOfSeats ?? 40,
      speed: 0,
      coordinates: [atharInfo.lat, atharInfo.lng],
      imei: bus.imei,
      engineStatus: atharInfo.engine_status
    }
  else:
    return {
      id: bus.id,
      busNumber: bus.busPlateNumber || bus.busName || "حافلة " + bus.id.slice(-4),
      driverName: bus.driverPhoneNumber || bus.busName || "غير محدد",
      route: "غير محدد",
      status: "offline",
      lastUpdate: "غير متصل",
      passengers: 0,
      capacity: bus.numberOfSeats ?? 40,
      speed: 0,
      coordinates: null,
      imei: bus.imei,
      engineStatus: false
    }
```

### 11.4 SSE event enqueue (stream body)

```text
// Inside your stream start():
payload = {
  type: "bus_locations",
  data: busLocations,   // array of BusLocationItem (§3.1)
  timestamp: new Date().toISOString()
}
chunk = "data: " + JSON.stringify(payload) + "\n\n"
controller.enqueue(encoder.encode(chunk))   // UTF-8
```

### 11.5 Frontend: consume SSE and update state

```text
url = baseUrl + "/api/buses/locations/websocket?token=" + encodeURIComponent(token)
eventSource = new EventSource(url)

eventSource.onmessage = (event) => {
  payload = JSON.parse(event.data)
  if payload.data && Array.isArray(payload.data):
    setBuses(payload.data)   // same shape as REST: BusLocationItem[]
    setLastUpdate(now())
}
```

---

## 12. File References (Current Codebase)

| Purpose | File |
|--------|------|
| REST locations API | `app/api/buses/locations/route.ts` |
| SSE locations stream | `app/api/buses/locations/websocket/route.ts` |
| Tracking page (state, fetch, SSE) | `app/(dashboard-groups)/institution/tracking/page.tsx` |
| Map component (markers, selection) | `components/live-tracking-map.tsx` |
| Athar service (zones/events; locations logic same as inline AtharApiService) | `lib/athar-service.ts` |
