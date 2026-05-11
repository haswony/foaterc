# نظام إدارة الديون والأقساط

Debt & Installment Management System — نظام احترافي متعدد المتاجر (Multi-tenant) لإدارة الزبائن، الديون، الأقساط، والدفعات مع تحليل ذكي لسلوك الدفع.

## التقنيات
- **Frontend**: React + TypeScript + Vite + Tailwind CSS (RTL) + TanStack Query + Zustand + React Router
- **Backend**: Hono + TypeScript + Prisma ORM + JWT + bcrypt
- **Database**: PostgreSQL (محلياً أو Railway)

## بنية المشروع
```
aksat/
├── api/         # Backend (Hono + Prisma)
└── web/         # Frontend (React + Vite)
```

## التشغيل المحلي

### 1) قاعدة البيانات
- ثبّت PostgreSQL أو استخدم Railway/Neon.
- أنشئ قاعدة بيانات باسم `debt_db`.

### 2) Backend
```bash
cd api
cp .env.example .env       # عدّل DATABASE_URL و JWT_SECRET
npm install
npm run prisma:generate
npm run prisma:migrate     # ينشئ الجداول
npm run seed               # ينشئ Super Admin (admin@system.local / Admin@123)
npm run dev                # http://localhost:4000
```

### 3) Frontend
```bash
cd web
cp .env.example .env       # VITE_API_URL=http://localhost:4000
npm install
npm run dev                # http://localhost:5173
```

## الحساب الافتراضي (Super Admin)
- البريد: `admin@system.local`
- كلمة المرور: `Admin@123`

> ⚠️ غيّرها بعد أول تسجيل دخول.

## الأدوار
- **SUPER_ADMIN**: مالك النظام — يضيف المتاجر وأصحابها.
- **STORE_OWNER**: صاحب المتجر — يدير موظفيه وزبائنه وديونه.
- **STAFF**: موظف داخل متجر معيّن.

البيانات معزولة بين المتاجر تلقائياً عبر `storeId`.

## النشر
### Backend على Railway
1. ادفع المجلد `api/` إلى GitHub.
2. أنشئ مشروع Railway جديد → أضف PostgreSQL plugin.
3. اربط الـ repo، عيّن متغيرات البيئة (`DATABASE_URL` يأتي تلقائياً من plugin، أضف `JWT_SECRET`, `CORS_ORIGIN`).
4. أمر البناء: `npm install && npm run prisma:generate && npm run prisma:migrate:deploy && npm run build`
5. أمر التشغيل: `npm start`

### Frontend على Cloudflare Pages / Netlify
1. ادفع المجلد `web/`.
2. Build command: `npm run build`
3. Output: `dist`
4. Env: `VITE_API_URL=https://<your-railway-url>`

## الميزات
- إدارة المتاجر والموظفين متعددي الأدوار.
- إدارة الزبائن (CRUD + بحث).
- إدارة الديون (دفع كامل أو أقساط أسبوعية/شهرية).
- جدولة الأقساط تلقائياً مع كشف المتأخر.
- تسجيل الدفعات وتاريخ كامل.
- تقييم ذكي للزبائن (ملتزم / متوسط / خطر) مبني على نسبة الالتزام والتأخير.
- Dashboard فيها: إجمالي الديون، المدفوع، المتبقي، المتأخرات، آخر العمليات، إحصائيات شهرية.
- طباعة وصل دفع، تصدير CSV.
- أمان: bcrypt، JWT، CORS، Helmet، عزل بيانات Multi-tenant.
