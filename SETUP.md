# إعداد النظام والتكامل مع Athar

## المتطلبات
- MongoDB
- مفاتيح Athar لكل بلدية (atharKey)
- إعدادات Next.js المعتادة

---

## المتغيرات البيئية الأساسية
```env
MONGODB_URI=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...

# Athar
ATHAR_BASE_URL=https://admin.alather.net/api/api.php
ATHAR_API_TYPE=user
ATHAR_VERSION=1.0

# رابط التطبيق (لـ Webhook)
NEXT_PUBLIC_APP_URL=https://your-domain.com
# أو
APP_URL=https://your-domain.com

# حماية Webhook (اختياري)
ATHAR_WEBHOOK_SECRET=your-secret

# OSRM routing (اختياري)
OSRM_BASE_URL=https://router.project-osrm.org
```

---

## تدفق إنشاء النقطة (مختصر)
1) إنشاء نقطة من النظام.
2) إنشاء Zone في Athar وحفظ `zoneId` داخل النقطة.
3) إنشاء أحداث `zone_in` و `zone_out` لكل مركبة فعّالة.
4) Athar يرسل الأحداث إلى `/api/athar/webhook`.

---

## أهم واجهات الـ API
### البلديات
- `GET /api/municipalities` (admin)
- `POST /api/municipalities` (admin)
- `GET /api/municipalities/:id` (admin)
- `PATCH /api/municipalities/:id` (admin)
- `DELETE /api/municipalities/:id` (admin)
- `GET /api/municipality` (حساب البلدية الحالي)

### المركبات والسائقين والنقاط والمسارات
- `GET/POST /api/vehicles`
- `GET/PATCH/DELETE /api/vehicles/:id`
- `GET/POST /api/drivers`
- `GET/PATCH/DELETE /api/drivers/:id`
- `GET/POST /api/points`
- `GET/PATCH/DELETE /api/points/:id`
- `GET/POST /api/routes`
- `GET/PATCH/DELETE /api/routes/:id`
- `GET/POST /api/routes/:id/points`

### الإحصائيات والأحداث
- `GET /api/dashboard/stats`
- `GET /api/events?limit=8`

### التقارير CSV
- `GET /api/reports/vehicles?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/reports/points?from=YYYY-MM-DD&to=YYYY-MM-DD`

---

## ملاحظات
- `zoneId` لا يُمرّر من العميل، ويتم توليده فقط من Athar.
- المنطقة الزمنية الافتراضية: `Asia/Damascus`.
