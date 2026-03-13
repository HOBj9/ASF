type ContactSubmissionItem = {
  _id: string;
  name?: string;
  email?: string;
  inquiryType?: string;
  expectedDailyMessages?: string;
  message?: string;
  status?: string;
  createdAt?: string | Date;
};

function formatInquiryType(value?: string) {
  switch (value) {
    case 'project_inquiry':
      return 'استفسار عن مشروع';
    case 'other':
      return 'أخرى';
    case 'web_inquiry':
    default:
      return 'استفسار عن الخدمة';
  }
}

function formatStatus(value?: string) {
  switch (value) {
    case 'reviewed':
      return 'تمت المراجعة';
    case 'archived':
      return 'مؤرشفة';
    case 'new':
    default:
      return 'جديدة';
  }
}

function formatDate(value?: string | Date) {
  if (!value) {
    return 'غير متوفر';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'غير متوفر';
  }

  return new Intl.DateTimeFormat('ar-SA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function ContactSubmissionsTable({
  initialSubmissions = [],
}: {
  initialSubmissions?: ContactSubmissionItem[];
}) {
  if (!initialSubmissions.length) {
    return (
      <div className="rounded-xl border bg-card p-6 text-right">
        <p className="text-muted-foreground">
          لا توجد رسائل تواصل مسجلة حتى الآن.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="border-b px-6 py-4 text-right">
        <h2 className="font-semibold">آخر رسائل التواصل</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          يتم عرض آخر {initialSubmissions.length} رسالة مرتبة من الأحدث إلى الأقدم.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-right">
          <thead className="bg-muted/40">
            <tr className="text-sm text-muted-foreground">
              <th className="px-4 py-3 font-medium">الاسم</th>
              <th className="px-4 py-3 font-medium">البريد الإلكتروني</th>
              <th className="px-4 py-3 font-medium">نوع الاستفسار</th>
              <th className="px-4 py-3 font-medium">الحجم المتوقع</th>
              <th className="px-4 py-3 font-medium">الحالة</th>
              <th className="px-4 py-3 font-medium">تاريخ الإرسال</th>
              <th className="px-4 py-3 font-medium">الرسالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {initialSubmissions.map((submission) => (
              <tr key={submission._id} className="align-top">
                <td className="px-4 py-4 font-medium text-foreground">
                  {submission.name || 'غير معروف'}
                </td>
                <td className="px-4 py-4 text-sm text-muted-foreground">
                  {submission.email || 'غير متوفر'}
                </td>
                <td className="px-4 py-4 text-sm text-muted-foreground">
                  {formatInquiryType(submission.inquiryType)}
                </td>
                <td className="px-4 py-4 text-sm text-muted-foreground">
                  {submission.expectedDailyMessages || 'غير متوفر'}
                </td>
                <td className="px-4 py-4 text-sm text-muted-foreground">
                  {formatStatus(submission.status)}
                </td>
                <td className="px-4 py-4 text-sm text-muted-foreground">
                  {formatDate(submission.createdAt)}
                </td>
                <td className="max-w-md px-4 py-4 text-sm leading-6 text-muted-foreground">
                  <div className="line-clamp-4 whitespace-pre-wrap">
                    {submission.message || 'لا توجد رسالة'}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
