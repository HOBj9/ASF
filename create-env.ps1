# PowerShell script to create .env.local file
# Run this script: .\create-env.ps1

$envContent = @"
MONGODB_URI=mongodb://admin:admin123@mongodb:27017/admin-dashboard?authSource=admin
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=admin-dashboard-secret-key-change-in-production-please-use-strong-random-string
"@

$envFile = ".env.local"

if (Test-Path $envFile) {
    Write-Host "⚠️  ملف .env.local موجود بالفعل!" -ForegroundColor Yellow
    $overwrite = Read-Host "هل تريد استبداله؟ (y/n)"
    if ($overwrite -ne "y") {
        Write-Host "تم الإلغاء." -ForegroundColor Red
        exit
    }
}

try {
    $envContent | Out-File -FilePath $envFile -Encoding utf8 -NoNewline
    Write-Host "✅ تم إنشاء ملف .env.local بنجاح!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 الخطوات التالية:" -ForegroundColor Cyan
    Write-Host "   1. قم بتشغيل: npm install" -ForegroundColor White
    Write-Host "   2. قم بتشغيل: npm run seed" -ForegroundColor White
    Write-Host "   3. قم بتشغيل: npm run dev" -ForegroundColor White
} catch {
    Write-Host "❌ حدث خطأ أثناء إنشاء الملف: $_" -ForegroundColor Red
}

