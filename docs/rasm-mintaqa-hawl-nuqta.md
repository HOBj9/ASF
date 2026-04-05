# رسم منطقة حول نقطة على الخريطة (دائرة / مضلع تقريبي)

هذا المستند يشرح **بدقة** كيف تُعرَض «منطقة» حول نقطة جغرافية (مركز + نصف قطر بالمتر)، مع أمثلة برمجية. المفاهيم مطابقة لما يُستخدَم غالباً في تطبيقات الخرائط ومزامنة المناطق مع أنظمة خارجية (مثل أثر).

---

## 1. المفاهيم الأساسية

| المصطلح | المعنى |
|--------|--------|
| **المركز** | زوج `(lat, lng)` بدرجات عشرية (WGS84). |
| **نصف القطر** | مسافة على سطح الأرض بالـ **متر** (مثلاً 500 م). |
| **المنطقة الدائرية الحقيقية** | مجموعة النقاط التي تبعد عن المركز **مسافة جيوديسية** ≤ نصف القطر. على الخريطة تُرسم غالباً كـ `Circle` في Leaflet لأن المكتبة تحسب الإسقاط والحجم بالمتر. |
| **مضلع يقارب الدائرة** | سلسلة رؤوس `(lat, lng)` تُغلق شكلاً شبه دائري؛ مفيد عندما يطلب الـ API **رؤوساً** فقط (مثل بعض واجهات المناطق). |

**ملاحظة:** استخدام خط عرض/طول كمحوري X/Y في مستوٍ مسطح يعطي دائرة **غير دقيقة** على الخرائط العالمية؛ لذلك إما تستخدم `L.circle` (أو ما يعادله) أو تولّد الرؤوس بصيغة **كرة** (Earth radius).

---

## 2. رسم دائرة مترية بـ Leaflet (JavaScript عادي)

Leaflet يدعم دائرة بنصف قطر **بالأمتار**؛ الشكل يتكيّف مع مستوى التكبير.

```javascript
import L from "leaflet";

const centerLat = 24.7136;
const centerLng = 46.6753;
const radiusMeters = 500;

const map = L.map("map").setView([centerLat, centerLng], 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap",
}).addTo(map);

const circle = L.circle([centerLat, centerLng], {
  radius: radiusMeters,
  color: "#f59e0b",
  weight: 2,
  fillColor: "#f59e0b",
  fillOpacity: 0.12,
}).addTo(map);
```

**لماذا هذا دقيق للعرض؟** لأن Leaflet يحسب شكل الدائرة وفق إسقاط الخريطة مع `radius` مُعرَّفاً بالمتر على الإهليلجي WGS84 (حسب إصدار Leaflet).

---

## 3. رسم دائرة بـ React Leaflet

```tsx
import { MapContainer, TileLayer, Circle, Marker, Popup } from "react-leaflet";

const center: [number, number] = [24.7136, 46.6753];
const radiusMeters = 500;

export function MapWithRadius() {
  return (
    <MapContainer center={center} zoom={13} style={{ height: "400px", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={center}>
        <Popup>مركز النقطة</Popup>
      </Marker>
      <Circle
        center={center}
        radius={radiusMeters}
        pathOptions={{
          color: "#f59e0b",
          weight: 2,
          fillColor: "#f59e0b",
          fillOpacity: 0.12,
        }}
      />
    </MapContainer>
  );
}
```

**`center` في React Leaflet:** مصفوفة `[lat, lng]` بنفس ترتيب Leaflet.

---

## 4. توليد رؤوس مضلع يقارب دائرة (لـ API يطلب إحداثيات فقط)

الفكرة: تمشي على زوايا `0° … 360°` وتُحسب لكل زاوية نقطة على **كرة** نصف قطرها نصف قطر الأرض، على بعد `radiusMeters` من المركز. هذا النمط يُستخدم في المشروع لبناء سلسلة `lat,lng,lat,lng,...` لمنطقة أثر.

صيغة مبسّطة (نفس المنطق الرياضي لدالة مثل `getZoneVertices` في خدمة أثر):

```typescript
const EARTH_RADIUS_M = 6378137.0;

/**
 * يعيد مصفوفة رؤوس { lat, lng } لمضلع يقارب دائرة نصف قطرها radiusMeters.
 * stepDegrees: كل كم درجة نأخذ رأساً (مثلاً 9 يعطي حوالي 41 نقطة + الإغلاق).
 */
function circleVerticesAsPolygon(
  centralLatitude: number,
  centralLongitude: number,
  radiusMeters: number,
  stepDegrees: number = 9
): Array<{ lat: number; lng: number }> {
  const distanceRad = radiusMeters / EARTH_RADIUS_M;
  const centralLatRad = (centralLatitude * Math.PI) / 180;
  const centralLngRad = (centralLongitude * Math.PI) / 180;
  const out: Array<{ lat: number; lng: number }> = [];

  for (let deg = 0; deg <= 360; deg += stepDegrees) {
    const radial = (deg * Math.PI) / 180;

    const latRad = Math.asin(
      Math.sin(centralLatRad) * Math.cos(distanceRad) +
        Math.cos(centralLatRad) * Math.sin(distanceRad) * Math.cos(radial)
    );

    const deltaLngRad = Math.atan2(
      Math.sin(radial) * Math.sin(distanceRad) * Math.cos(centralLatRad),
      Math.cos(distanceRad) - Math.sin(centralLatRad) * Math.sin(latRad)
    );

    let lngRad = centralLngRad + deltaLngRad;
    lngRad = ((lngRad + Math.PI) % (2 * Math.PI)) - Math.PI;

    out.push({
      lat: (latRad * 180) / Math.PI,
      lng: (lngRad * 180) / Math.PI,
    });
  }

  return out;
}
```

**عرض المضلع في React Leaflet** (بعد تحويل الرؤوس إلى `positions`):

```tsx
import { Polygon } from "react-leaflet";

const vertices = circleVerticesAsPolygon(24.7136, 46.6753, 500, 9);
const positions = vertices.map((v) => [v.lat, v.lng]) as [number, number][];

<Polygon
  positions={positions}
  pathOptions={{ color: "#f59e0b", weight: 2, fillColor: "#f59e0b", fillOpacity: 0.12 }}
/>;
```

**فرق عملي:** الدائرة من `Circle` أنعم وأبسط للعرض؛ المضلع مطلوب عند التخزين أو الـ API كـ «حواف» ثابتة.

---

## 5. التحقق: هل نقطة داخل «نطاق نصف القطر»؟ (مسافة جيوديسية)

للتتبع أو التنبيهات، غالباً تقارن **مسافة المركبة من المركز** مع `radiusMeters` (وليس رسم المضلع فقط).

صيغة **Haversine** (مسافة بين نقطتين على الكرة):

```typescript
function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6378137;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const inside = haversineDistanceMeters(vehicleLat, vehicleLng, pointLat, pointLng) <= radiusMeters;
```

هذا النوع من المنطق يتوافق مع فكرة «النقطة داخل نصف القطر» المخزَّن في الحقل `radiusMeters` لنقاط النظام.

---

## 6. التحقق: نقطة داخل **مضلع** (ليس بالضرورة دائرة)

إذا كانت «المنطقة» مضلعاً حراً (مثل منطقة مستوردة من أثر)، يُستخدم غالباً **اختبار شعاع** (ray casting). مثال مطابق لفكرة الدوال في خرائط البلدية:

```typescript
function isPointInsidePolygon(
  lat: number,
  lng: number,
  polygon: Array<{ lat: number; lng: number }>
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat;
    const yi = polygon[i].lng;
    const xj = polygon[j].lat;
    const yj = polygon[j].lng;
    const intersect =
      yi > lng !== yj > lng &&
      lat < ((xj - xi) * (lng - yi)) / (yj - yi + 1e-7) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
```

**تنبيه:** هنا يُعامل `(lat, lng)` كمستوٍ للاختبار؛ للمناطق الصغيرة غالباً يكفي. للمناطق الكبيرة جداً أو الدقة العالية يُفضَّل خوارزميات على سطح الإهليلج.

---

## 7. الربط بمشروع إدارة النفايات (مرجع داخلي)

- **نصف القطر مخزَّن للنقطة:** حقل `radiusMeters` في نموذج النقطة وواجهات الـ API (مثلاً إنشاء نقطة مع قيمة افتراضية مثل 500 م).
- **توليد رؤوس لمنطقة أثر:** الدالة الخاصة ببناء سلسلة الإحداثيات من مركز + نصف قطر موجودة في خدمة أثر (`getZoneVertices`) — نفس الرياضيات الموضّحة في القسم 4.
- **رسم المناطق كمضلعات على الخريطة:** عند تفعيل طبقة المناطق، تُعرَض `Polygon` من `zone.vertices`.
- **طبقة النقاط الحالية:** قد تعرض العلامات فقط دون دائرة مرئية لكل نقطة؛ إن رغبت بإظهار نصف القطر لكل نقطة يمكن إضافة `Circle` أو مضلع مُولَّد من `radiusMeters` كما في الأقسام 3 و 4.

---

## 8. ملخص اختيار الأداة

| الحاجة | الأنسب |
|--------|--------|
| عرض بصري سريع ودقيق بالمتر على الخريطة | `L.circle` / `<Circle radius={meters} />` |
| إرسال/تخزين حدود كقائمة نقاط | توليد مضلع بالقسم 4 |
| دخول/خروج مركبة من «نطاق» دائري | Haversine أو مكتبة مسافات جيوديسية |
| نقطة داخل منطقة معرّفة بمضلع | `isPointInsidePolygon` (أو مكتبة GIS) |

---

*آخر تحديث للمستند: توثيق إرشادي للفريق — يمكن توسيعه بأمثلة اختبارات وحدة لدوال المسافة والمضلع.*
