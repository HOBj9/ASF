#!/bin/bash
# Bash script to create .env.local file
# Run this script: chmod +x create-env.sh && ./create-env.sh

ENV_FILE=".env.local"

if [ -f "$ENV_FILE" ]; then
    echo "⚠️  ملف .env.local موجود بالفعل!"
    read -p "هل تريد استبداله؟ (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "تم الإلغاء."
        exit 1
    fi
fi

cat > "$ENV_FILE" << EOF
MONGODB_URI=mongodb://admin:admin123@mongodb:27017/admin-dashboard?authSource=admin
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=admin-dashboard-secret-key-change-in-production-please-use-strong-random-string
EOF

echo "✅ تم إنشاء ملف .env.local بنجاح!"
echo ""
echo "📝 الخطوات التالية:"
echo "   1. قم بتشغيل: npm install"
echo "   2. قم بتشغيل: npm run seed"
echo "   3. قم بتشغيل: npm run dev"

