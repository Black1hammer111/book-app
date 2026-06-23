# مشروع البحث عن الكتب 📚

تطبيق Web API مبني بـ **ASP.NET Core 8 (Minimal APIs)** + **Entity Framework Core**، مرتبط بـ **Google Cloud Platform**، مع محرك بحث ذكي مبني على نموذج N-gram.

> ⚠️ هذا الملف يوثّق البنية **الفعلية** للكود الحالي. أي توثيق سابق يذكر Controllers/Views بنمط MVC كان لا يطابق الكود وتم تجاوزه.

---

## التقنيات المستخدمة

| التقنية | الاستخدام |
|---------|-----------|
| ASP.NET Core 8 — Minimal APIs | إطار التطبيق وكل الـ endpoints |
| Entity Framework Core 8 | ORM + قاعدة البيانات |
| SQLite | قاعدة البيانات المحلية للتطوير |
| PostgreSQL (Npgsql) | Cloud SQL على GCP |
| Google Cloud Run | استضافة التطبيق |
| Google Cloud SQL | قاعدة البيانات السحابية |
| Google Secret Manager | تخزين كلمة سر قاعدة البيانات ومفتاح الـ API بأمان |
| Docker | تحزيم التطبيق |

---

## هيكل المشروع الحقيقي

```
BookSearchApp/
├── Models/
│   └── Book.cs                 ← Id, Title, Author, Year
├── Data/
│   └── AppDbContext.cs         ← Entity Framework DbContext
├── Services/
│   └── SmartSearchEngine.cs    ← محرك البحث الذكي (N-gram)
├── appsettings.json            ← إعدادات محلية (SQLite)
├── appsettings.Production.json ← إعدادات الإنتاج (بدون قيم حساسة، تُحقن من Cloud Run)
├── books.db                    ← قاعدة بيانات SQLite للتطوير المحلي
├── Dockerfile
├── .dockerignore
└── Program.cs                  ← نقطة الدخول + كل API endpoints

cloudbuild.yaml                 ← CI/CD على Cloud Build
deploy.sh                       ← سكريبت النشر (يستخدم Secret Manager)
```

لا يوجد في هذا المشروع Controllers أو Views أو Razor Pages — كل شيء عبارة عن Web API.

---

## تشغيل المشروع محلياً

```bash
cd BookSearchApp
dotnet restore
dotnet run
```

سيشتغل التطبيق على SQLite محلياً (`books.db`) بدون أي إعداد إضافي.

---

## واجهات الـ API

| Method | Endpoint | الوصف | يحتاج X-Api-Key؟ |
|--------|----------|-------|-------------------|
| GET | `/api/books` | كل الكتب | لا |
| GET | `/api/books/{id}` | كتاب محدد | لا |
| GET | `/api/books/search?title=` | بحث بالعنوان | لا |
| GET | `/api/books/smart-search?q=` | بحث ذكي (N-gram) | لا |
| POST | `/api/books` | إضافة كتاب | **نعم** |
| DELETE | `/api/books/{id}` | حذف كتاب | **نعم** |
| DELETE | `/api/books/duplicates` | حذف الكتب المكررة | **نعم** |

عمليات الإضافة والحذف محمية بمفتاح API يُمرَّر في الهيدر:

```
X-Api-Key: <القيمة المحددة في appsettings أو في Secret Manager>
```

محلياً، القيمة الافتراضية في `appsettings.json` هي `local-dev-only-change-me` — غيّرها كما تشاء أثناء التطوير، لكن **لا تستخدمها في الإنتاج إطلاقاً**؛ في الإنتاج تُولَّد قيمة عشوائية تلقائياً عبر `deploy.sh` وتُخزَّن في Secret Manager.

---

## النشر على Google Cloud Platform

### المتطلبات
- حساب Google Cloud Platform
- `gcloud CLI` مثبت ومُسجَّل دخول
- صلاحية تفعيل الفوترة على المشروع

### خطوات النشر

```bash
gcloud auth login
gcloud auth configure-docker

gcloud projects create my-book-search --name="Book Search App"
gcloud config set project my-book-search

# فعّل الفوترة من https://console.cloud.google.com/billing

bash deploy.sh my-book-search
```

`deploy.sh` يقوم تلقائياً بـ: إنشاء قاعدة بيانات Cloud SQL PostgreSQL، توليد كلمة سر عشوائية ومفتاح API عشوائي وتخزينهما في **Secret Manager** (لا تُكتب أي كلمة سر في أي ملف على الإطلاق)، بناء صورة Docker، ونشرها على Cloud Run مع حقن الأسرار وقت التشغيل فقط.

بعد أول نشر، يمكن لـ `cloudbuild.yaml` (CI/CD تلقائي عند كل رفع كود) أن يعيد النشر باستخدام نفس الأسرار الموجودة مسبقاً في Secret Manager دون الحاجة لإعادة إنشائها.

---

## ملاحظات أمان مهمة

- لا توجد أي كلمة سر أو مفتاح مكتوب بشكل صريح في أي ملف بالمشروع (كود أو سكريبتات نشر).
- كلمة سر قاعدة البيانات ومفتاح حماية الـ API يُخزَّنان في Google Secret Manager، ويُحقنان في Cloud Run فقط وقت التشغيل عبر `--set-secrets`.
- تهيئة قاعدة البيانات تستخدم `EnsureCreated()` فقط، وتُنشئ الجداول إذا لم تكن موجودة دون لمس أي بيانات قائمة.
- البيانات التجريبية (30 كتاباً) تُضاف **مرة واحدة فقط** إذا كانت قاعدة البيانات فاضية تماماً، ولا يوجد أي منطق يحذف بيانات حقيقية تلقائياً بعد ذلك.

---

## الميزات

- 🔍 بحث عادي بالعنوان
- 🤖 بحث ذكي (N-gram) مع تنبؤ بالكلمات وردود تشبه LLM
- ➕ إضافة كتاب (محمي بمفتاح API)
- 🗑️ حذف كتاب / حذف الكتب المكررة (محمي بمفتاح API)
- ☁️ نشر جاهز على Google Cloud Run + Cloud SQL
