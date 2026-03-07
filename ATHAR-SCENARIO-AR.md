# سيناريو التكامل مع منصة أثر - توثيق باللغة العربية

## نظرة عامة

يصف هذا المستند السيناريو الكامل لإنشاء النقاط والمناطق والأحداث في منصة أثر (Athar) مع ربط Webhook للإشعارات عند دخول أو خروج السيارات من المناطق.

---

## جدول المحتويات

1. [المتطلبات الأساسية](#المتطلبات-الأساسية)
2. [الخطوة 1: إنشاء النقطة](#الخطوة-1-إنشاء-النقطة)
3. [الخطوة 2: إنشاء المنطقة في أثر](#الخطوة-2-إنشاء-المنطقة-في-أثر)
4. [الخطوة 3: جلب كل السيارات من أثر](#الخطوة-3-جلب-كل-السيارات-من-أثر)
5. [الخطوة 4: جلب كل المناطق من أثر](#الخطوة-4-جلب-كل-المناطق-من-أثر)
6. [الخطوة 5: إنشاء حدث zone_in](#الخطوة-5-إنشاء-حدث-zone_in)
7. [الخطوة 6: إنشاء حدث zone_out](#الخطوة-6-إنشاء-حدث-zone_out)
8. [ماذا يرسل أثر إلى الـ Webhook](#ماذا-يرسل-أثر-إلى-الـ-webhook)
9. [مثال عملي متكامل](#مثال-عملي-متكامل)

---

## المتطلبات الأساسية

### معلومات الاتصال بـ API أثر

| المعامل | القيمة |
|---------|--------|
| **رابط API الأساسي** | `https://admin.alather.net/api/api.php` |
| **نوع API** | `user` |
| **الإصدار** | `1.0` |
| **مفتاح API (مثال)** | `37829AB4B4412B2871BC9D45828C3289` |

### طريقة المصادقة

تُضاف المعاملات التالية إلى كل طلب:

- `api=user`
- `ver=1.0`
- `key=YOUR_API_KEY`

---

## الخطوة 1: إنشاء النقطة

يقوم المستخدم بإنشاء نقطة خاصة به في النظام. النقطة تحتوي على:

- الاسم (عربي/إنجليزي)
- الإحداثيات (خط العرض، خط الطول)
- نصف القطر (اختياري، افتراضي 500 متر)

### مثال من النظام الحالي

في نظام إدارة النفايات، يتم إنشاء النقطة عبر:

**Endpoint:** `POST /api/points`

**Request Body:**
```json
{
  "name": "نقطة التجميع الرئيسية",
  "nameAr": "نقطة التجميع الرئيسية",
  "nameEn": "Main Collection Point",
  "lat": 24.7136,
  "lng": 46.6753,
  "radiusMeters": 500,
  "isActive": true
}
```

النظام يقوم تلقائياً بإنشاء المنطقة في أثر وربطها بالنقطة.

---

## الخطوة 2: إنشاء المنطقة في أثر

المنطقة (Zone) هي منطقة جغرافية دائرية تُعرّف في منصة أثر لمراقبة دخول وخروج السيارات.

### أمر API: `ADD_ZONE`

**الرابط الكامل (مثال):**
```
https://admin.alather.net/api/api.php?api=user&ver=1.0&key=37829AB4B4412B2871BC9D45828C3289&cmd=ADD_ZONE&name=نقطة التجميع&zone_vertices=24.7191,46.6753,24.7190,46.6762,...&zone_id=false&group_id=0
```

**المعاملات المطلوبة:**

| المعامل | الوصف | مثال |
|---------|-------|------|
| `cmd` | الأمر | `ADD_ZONE` |
| `name` | اسم المنطقة | `نقطة التجميع الرئيسية` |
| `zone_vertices` | إحداثيات حدود المنطقة (lat1,lng1,lat2,lng2,...) | يُحسب تلقائياً من المركز ونصف القطر |
| `zone_id` | للمناطق الجديدة | `false` |
| `group_id` | معرف المجموعة | `0` |

**مثال باستخدام cURL:**
```bash
curl "https://admin.alather.net/api/api.php?api=user&ver=1.0&key=37829AB4B4412B2871BC9D45828C3289&cmd=ADD_ZONE&name=نقطة%20التجميع&zone_vertices=24.7191,46.6753,24.7190,46.6762&zone_id=false&group_id=0"
```

**الاستجابة المتوقعة:**
```json
{
  "zone_id": "74294"
}
```

يُستخدم `zone_id` في الخطوات التالية لربط الأحداث بالمنطقة.

---

## الخطوة 3: جلب كل السيارات من أثر

### أمر API: `USER_GET_OBJECTS`

يجلب هذا الأمر قائمة بكل السيارات/الأجهزة (Objects) المرتبطة بحساب أثر.

**الرابط الكامل (مثال):**
```
https://admin.alather.net/api/api.php?api=user&ver=1.0&key=37829AB4B4412B2871BC9D45828C3289&cmd=USER_GET_OBJECTS
```

**مثال باستخدام cURL:**
```bash
curl "https://admin.alather.net/api/api.php?api=user&ver=1.0&key=37829AB4B4412B2871BC9D45828C3289&cmd=USER_GET_OBJECTS"
```

**مثال باستخدام PowerShell:**
```powershell
Invoke-RestMethod -Uri "https://admin.alather.net/api/api.php?api=user&ver=1.0&key=37829AB4B4412B2871BC9D45828C3289&cmd=USER_GET_OBJECTS"
```

**الاستجابة (مثال):**
```json
{
  "objects": [
    {
      "id": "12345",
      "imei": "123456789012345",
      "name": "سيارة 1",
      "plateNumber": "أ ب ج 1234"
    },
    {
      "id": "12346",
      "imei": "987654321098765",
      "name": "سيارة 2",
      "plateNumber": "د ه و 5678"
    }
  ]
}
```

**ملاحظة:** يُستخدم حقل `imei` لربط كل سيارة بأحداث المنطقة (zone_in و zone_out).

---

## الخطوة 4: جلب كل المناطق من أثر

### أمر API: `USER_GET_ZONES`

يجلب هذا الأمر قائمة بكل المناطق (Zones) المعرّفة في حساب أثر.

**الرابط الكامل (مثال):**
```
https://admin.alather.net/api/api.php?api=user&ver=1.0&key=37829AB4B4412B2871BC9D45828C3289&cmd=USER_GET_ZONES
```

**مثال باستخدام cURL:**
```bash
curl "https://admin.alather.net/api/api.php?api=user&ver=1.0&key=37829AB4B4412B2871BC9D45828C3289&cmd=USER_GET_ZONES"
```

**مثال باستخدام PowerShell:**
```powershell
Invoke-RestMethod -Uri "https://admin.alather.net/api/api.php?api=user&ver=1.0&key=37829AB4B4412B2871BC9D45828C3289&cmd=USER_GET_ZONES"
```

**الاستجابة (مثال):**
```json
{
  "zones": [
    {
      "zone_id": "74294",
      "name": "نقطة التجميع الرئيسية",
      "zone_vertices": "24.7191,46.6753,24.7190,46.6762,..."
    },
    {
      "zone_id": "74295",
      "name": "منطقة التفريغ",
      "zone_vertices": "..."
    }
  ]
}
```

---

## الخطوة 5: إنشاء حدث zone_in

حدث **zone_in** يُفعّل عندما تدخل سيارة إلى منطقة معينة. عند الحدث، تستدعي أثر رابط الـ Webhook.

### أمر API: `ADD_NEW_EVENT`

**المعاملات المطلوبة:**

| المعامل | الوصف | مثال |
|---------|-------|------|
| `cmd` | الأمر | `ADD_NEW_EVENT` |
| `name` | اسم الحدث | `نقطة التجميع_zone_in` |
| `zones` | معرف المنطقة | `74294` |
| `event_id` | للمناطق الجديدة | `false` |
| `type` | نوع الحدث | `zone_in` |
| `webhook_url` | رابط الـ Webhook (يُضاف zone_id تلقائياً) | `https://your-domain.com/api/athar/webhook?zone_id=74294` |
| `webhook_template_id` | قالب Webhook | `0` |
| `imei` | رقم IMEI للسيارة | `123456789012345` |

**الرابط الكامل (مثال لسيارة واحدة ومنطقة واحدة):**
```
https://admin.alather.net/api/api.php?api=user&ver=1.0&key=37829AB4B4412B2871BC9D45828C3289&cmd=ADD_NEW_EVENT&name=نقطة%20التجميع_zone_in&zones=74294&event_id=false&type=zone_in&webhook_url=https%3A%2F%2Fyour-domain.com%2Fapi%2Fathar%2Fwebhook%3Fzone_id%3D74294&webhook_template_id=0&imei=123456789012345
```

**مثال باستخدام cURL:**
```bash
curl "https://admin.alather.net/api/api.php?api=user&ver=1.0&key=37829AB4B4412B2871BC9D45828C3289&cmd=ADD_NEW_EVENT&name=نقطة%20التجميع_zone_in&zones=74294&event_id=false&type=zone_in&webhook_url=https%3A%2F%2Fyour-domain.com%2Fapi%2Fathar%2Fwebhook%3Fzone_id%3D74294&webhook_template_id=0&imei=123456789012345"
```

**الاستجابة المتوقعة:**
```json
{
  "event_id": "123456"
}
```

---

## الخطوة 6: إنشاء حدث zone_out

حدث **zone_out** يُفعّل عندما تخرج سيارة من منطقة معينة.

### أمر API: `ADD_NEW_EVENT`

نفس الأمر السابق مع تغيير `type` إلى `zone_out`.

**مثال باستخدام cURL:**
```bash
curl "https://admin.alather.net/api/api.php?api=user&ver=1.0&key=37829AB4B4412B2871BC9D45828C3289&cmd=ADD_NEW_EVENT&name=نقطة%20التجميع_zone_out&zones=74294&event_id=false&type=zone_out&webhook_url=https%3A%2F%2Fyour-domain.com%2Fapi%2Fathar%2Fwebhook%3Fzone_id%3D74294&webhook_template_id=0&imei=123456789012345"
```

---

## ماذا يرسل أثر إلى الـ Webhook

عند دخول سيارة إلى منطقة (**zone_in**) أو خروجها منها (**zone_out**)، تستدعي منصة أثر رابط الـ Webhook الذي حددته عند إنشاء الحدث. الطلب يكون عادةً بطريقة **GET** مع إرسال البيانات كمعاملات في الـ Query String.

### مثال حقيقي لطلب Webhook من أثر

**تفاصيل الطلب:**

| العنصر | القيمة |
|--------|--------|
| **التاريخ** | ٤‏/٣‏/٢٠٢٦ ١:٤٥:١٧ م |
| **الطريقة** | GET |
| **الرابط** | `/api/athar/webhook/incoming?username=...&...` |

**الرابط الكامل (مثال):**
```
https://wms.alather.net/api/athar/webhook/incoming?username=swan.co&name=215356+-+%D8%A7%D9%8A%D8%B3%D9%88%D8%B2%D9%88&imei=354778343256320&type=zone_out&desc=zone_out_insights+%2816%29&sensor_data=&zone_name=16&event_id=38154&lat=33.556883&lng=36.3227&speed=0&altitude=0&angle=0&dt_server=2026-03-04+10%3A34%3A46&dt_tracker=2026-03-04+10%3A45%3A07&tr_model=%D8%A7%D9%8A%D8%B3%D9%88%D8%B2%D9%88&vin=%D8%AF%D9%85%D8%B4%D9%82&plate_number=215356&sim_number=0992067182&driver_name=&trailer_name=&odometer=38759&eng_hours=0&template_message=&template_subject=
```

### معاملات Query (البيانات المرسلة)

| المعامل | الوصف | مثال |
|---------|-------|------|
| `username` | اسم المستخدم في أثر | `swan.co` |
| `name` | اسم المركبة | `215356 - ايسوزو` |
| `imei` | رقم IMEI للجهاز | `354778343256320` |
| `type` | نوع الحدث | `zone_in` أو `zone_out` |
| `desc` | وصف الحدث | `zone_out_insights (16)` |
| `zone_name` | اسم المنطقة أو معرفها | `16` |
| `zone_id` | معرف المنطقة (قد يظهر في بعض الإصدارات) | `16` أو `74294` |
| `event_id` | معرف الحدث في أثر | `38154` |
| `lat` | خط العرض | `33.556883` |
| `lng` | خط الطول | `36.3227` |
| `speed` | السرعة | `0` |
| `altitude` | الارتفاع | `0` |
| `angle` | اتجاه الحركة | `0` |
| `dt_server` | وقت الخادم | `2026-03-04 10:34:46` |
| `dt_tracker` | وقت الجهاز | `2026-03-04 10:45:07` |
| `tr_model` | موديل المركبة | `ايسوزو` |
| `vin` | رقم الهيكل | `دمشق` |
| `plate_number` | رقم اللوحة | `215356` |
| `sim_number` | رقم الشريحة | `0992067182` |
| `driver_name` | اسم السائق | (فارغ) |
| `trailer_name` | اسم المقطورة | (فارغ) |
| `odometer` | عداد المسافات | `38759` |
| `eng_hours` | ساعات تشغيل المحرك | `0` |
| `template_message` | رسالة القالب | (فارغ) |
| `template_subject` | موضوع القالب | (فارغ) |
| `sensor_data` | بيانات المستشعرات | (فارغ) |

### مثال JSON للبيانات (بعد فك الترميز)

```json
{
  "username": "swan.co",
  "name": "215356 - ايسوزو",
  "imei": "354778343256320",
  "type": "zone_out",
  "desc": "zone_out_insights (16)",
  "sensor_data": "",
  "zone_name": "16",
  "event_id": "38154",
  "lat": "33.556883",
  "lng": "36.3227",
  "speed": "0",
  "altitude": "0",
  "angle": "0",
  "dt_server": "2026-03-04 10:34:46",
  "dt_tracker": "2026-03-04 10:45:07",
  "tr_model": "ايسوزو",
  "vin": "دمشق",
  "plate_number": "215356",
  "sim_number": "0992067182",
  "driver_name": "",
  "trailer_name": "",
  "odometer": "38759",
  "eng_hours": "0",
  "template_message": "",
  "template_subject": ""
}
```

### Headers المرسلة (مثال)

```json
{
  "accept": "*/*",
  "accept-encoding": "gzip, deflate",
  "connection": "upgrade",
  "host": "wms.alather.net",
  "user-agent": "Python/3.10 aiohttp/3.10.5",
  "x-forwarded-for": "185.84.236.36",
  "x-forwarded-host": "wms.alather.net",
  "x-forwarded-port": "3036",
  "x-forwarded-proto": "https",
  "x-real-ip": "185.84.236.36"
}
```

### ملاحظات للمستخدم

- **معالجة zone_id** في النظام الحالي: قد يرسل أثر `zone_name` أو `zone_id`؛ يُفضّل معالجة كليهما في الـ Webhook.
- **الرابط** قد يختلف حسب إعدادات أثر: `zone_id` أو `zone_name` يمكن أن يكونا رقم المنطقة أو اسمها.
- **الاستجابة المتوقعة** من الـ Webhook: يُفضّل إرجاع `200 OK` مع `{"success": true}` حتى يعتبر أثر أن الطلب تمت معالجته بنجاح.

---

## مثال عملي متكامل

### السيناريو الكامل

1. المستخدم ينشئ نقطة خاصة به
2. المستخدم ينشئ منطقة في أثر (أو تُنشأ تلقائياً مع النقطة)
3. المستخدم يجلب كل السيارات من أثر
4. المستخدم يجلب كل المناطق من أثر
5. المستخدم ينشئ حدث **zone_in** لكل سيارة × كل منطقة مع رابط Webhook
6. المستخدم ينشئ حدث **zone_out** لكل سيارة × كل منطقة مع رابط Webhook

### مثال برمجي (JavaScript/Node.js)

```javascript
const API_KEY = '37829AB4B4412B2871BC9D45828C3289';
const BASE_URL = 'https://admin.alather.net/api/api.php';
const WEBHOOK_URL = 'https://your-domain.com/api/athar/webhook';

async function makeRequest(params) {
  const url = new URL(BASE_URL);
  url.searchParams.append('api', 'user');
  url.searchParams.append('ver', '1.0');
  url.searchParams.append('key', API_KEY);
  Object.entries(params).forEach(([k, v]) => {
    if (v != null) url.searchParams.append(k, String(v));
  });
  const res = await fetch(url.toString());
  return res.json();
}

// 1. جلب كل السيارات
const objectsRes = await makeRequest({ cmd: 'USER_GET_OBJECTS' });
const objects = objectsRes.objects || objectsRes.data || [];
const imeis = objects.map(o => o.imei).filter(Boolean);

// 2. جلب كل المناطق
const zonesRes = await makeRequest({ cmd: 'USER_GET_ZONES' });
let zones = zonesRes.zones || zonesRes.data?.zones || [];
if (!Array.isArray(zones) && typeof zones === 'object') {
  zones = Object.entries(zones).map(([k, v]) => ({ ...v, zone_id: v.zone_id || k }));
}
const zoneIds = zones.map(z => String(z.zone_id || z.id || '').match(/^\d+/)?.[0]).filter(Boolean);

// 3. إنشاء أحداث zone_in و zone_out لكل (سيارة × منطقة)
for (const zoneId of zoneIds) {
  const zoneName = zones.find(z => (z.zone_id || z.id) == zoneId)?.name || `zone_${zoneId}`;
  const webhookWithZone = `${WEBHOOK_URL}${WEBHOOK_URL.includes('?') ? '&' : '?'}zone_id=${zoneId}`;

  for (const imei of imeis) {
    // حدث zone_in
    await makeRequest({
      cmd: 'ADD_NEW_EVENT',
      name: `${zoneName}_zone_in`,
      zones: zoneId,
      event_id: 'false',
      type: 'zone_in',
      webhook_url: webhookWithZone,
      webhook_template_id: 0,
      imei,
    });

    // حدث zone_out
    await makeRequest({
      cmd: 'ADD_NEW_EVENT',
      name: `${zoneName}_zone_out`,
      zones: zoneId,
      event_id: 'false',
      type: 'zone_out',
      webhook_url: webhookWithZone,
      webhook_template_id: 0,
      imei,
    });
  }
}
```

### مثال باستخدام PowerShell

```powershell
$apiKey = "37829AB4B4412B2871BC9D45828C3289"
$baseUrl = "https://admin.alather.net/api/api.php"
$webhookUrl = "https://your-domain.com/api/athar/webhook"

# جلب السيارات
$objectsUrl = "$baseUrl`?api=user&ver=1.0&key=$apiKey&cmd=USER_GET_OBJECTS"
$objects = (Invoke-RestMethod -Uri $objectsUrl).objects

# جلب المناطق
$zonesUrl = "$baseUrl`?api=user&ver=1.0&key=$apiKey&cmd=USER_GET_ZONES"
$zones = (Invoke-RestMethod -Uri $zonesUrl).zones

foreach ($zone in $zones) {
    $zoneId = $zone.zone_id
    $zoneName = $zone.name
    $webhookWithZone = "$webhookUrl`?zone_id=$zoneId"

    foreach ($obj in $objects) {
        $imei = $obj.imei
        if (-not $imei) { continue }

        # حدث zone_in
        $eventInUrl = "$baseUrl`?api=user&ver=1.0&key=$apiKey&cmd=ADD_NEW_EVENT&name=$([uri]::EscapeDataString("${zoneName}_zone_in"))&zones=$zoneId&event_id=false&type=zone_in&webhook_url=$([uri]::EscapeDataString($webhookWithZone))&webhook_template_id=0&imei=$imei"
        Invoke-RestMethod -Uri $eventInUrl

        # حدث zone_out
        $eventOutUrl = "$baseUrl`?api=user&ver=1.0&key=$apiKey&cmd=ADD_NEW_EVENT&name=$([uri]::EscapeDataString("${zoneName}_zone_out"))&zones=$zoneId&event_id=false&type=zone_out&webhook_url=$([uri]::EscapeDataString($webhookWithZone))&webhook_template_id=0&imei=$imei"
        Invoke-RestMethod -Uri $eventOutUrl
    }
}
```

---

## ربط التنفيذ داخل النظام

يتم تنفيذ هذا السيناريو في النظام الحالي كما يلي:

| الخطوة | الملف | الوظيفة |
|--------|-------|---------|
| إنشاء النقطة + المنطقة | `src/app/api/points/route.ts` | `POST` - ينشئ النقطة والمنطقة في أثر |
| إنشاء منطقة لنقطة موجودة | `src/app/api/points/[id]/create-athar-zone/route.ts` | `POST` - ينشئ المنطقة وأحداث zone_in/zone_out |
| جلب السيارات من أثر | `src/app/api/athar/objects/route.ts` | `GET` - يستدعي `AtharService.getObjects()` |
| جلب المناطق من أثر | `src/app/api/athar/zones/route.ts` | `GET` - يستدعي `AtharService.getZones()` |
| خدمة أثر | `src/lib/services/athar.service.ts` | `createZone`, `createZoneEvent`, `getObjects`, `getZones` |
| معالجة Webhook | `src/lib/services/athar-webhook.service.ts` | معالجة طلبات zone_in و zone_out من أثر |

---

## روابط API مباشرة (باستخدام المفتاح المثال)

| الوظيفة | الرابط |
|---------|--------|
| جلب السيارات | [USER_GET_OBJECTS](https://admin.alather.net/api/api.php?api=user&ver=1.0&key=37829AB4B4412B2871BC9D45828C3289&cmd=USER_GET_OBJECTS) |
| جلب المناطق | [USER_GET_ZONES](https://admin.alather.net/api/api.php?api=user&ver=1.0&key=37829AB4B4412B2871BC9D45828C3289&cmd=USER_GET_ZONES) |

---

## ملاحظات أمنية

- **لا تشارك مفتاح API** في المستودعات العامة أو أمام المستخدمين.
- استخدم متغيرات البيئة (`ATHAR_API_KEY` أو `atharKey` في قاعدة البيانات) لتخزين المفتاح.
- المفتاح `37829AB4B4412B2871BC9D45828C3289` المستخدم هنا هو للتوضيح فقط؛ يُفضّل استبداله بمفتاح تجريبي أو حقيقي حسب البيئة.

---

*آخر تحديث: مارس 2025*
