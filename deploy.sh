

set -e

PROJECT_ID=${1:-"your-project-id"}
REGION="us-central1"
INSTANCE_NAME="books-db"
DB_NAME="booksdb"
DB_USER="booksuser"
SERVICE_NAME="book-search"

DB_PASSWORD_SECRET="book-search-db-password"
CONNECTION_STRING_SECRET="book-search-db-connection"
API_KEY_SECRET="book-search-api-key"

echo "======================================"
echo " نشر مشروع البحث عن الكتب على GCP"
echo " Project: $PROJECT_ID"
echo "======================================"

# 1. Set project
echo "[1/9] إعداد المشروع..."
gcloud config set project "$PROJECT_ID"

# 2. Enable APIs (أضفنا secretmanager.googleapis.com)
echo "[2/9] تفعيل الخدمات السحابية..."
gcloud services enable \
  sqladmin.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com

# 3. Create Cloud SQL PostgreSQL instance
echo "[3/9] إنشاء Cloud SQL PostgreSQL..."
gcloud sql instances create "$INSTANCE_NAME" \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region="$REGION" \
  --storage-auto-increase || echo "Instance already exists, skipping..."

# 4. توليد/استرجاع كلمة سر قاعدة البيانات بأمان (لا تُكتب أبداً في أي ملف)
echo "[4/9] إعداد كلمة سر قاعدة البيانات عبر Secret Manager..."
if gcloud secrets describe "$DB_PASSWORD_SECRET" >/dev/null 2>&1; then
  echo "كلمة السر موجودة مسبقاً، سيتم إعادة استخدامها."
  DB_PASSWORD=$(gcloud secrets versions access latest --secret="$DB_PASSWORD_SECRET")
else
  DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | head -c 24)
  printf '%s' "$DB_PASSWORD" | gcloud secrets create "$DB_PASSWORD_SECRET" --data-file=- --replication-policy=automatic
fi

# 5. Create Database & User
echo "[5/9] إنشاء قاعدة البيانات والمستخدم..."
gcloud sql databases create "$DB_NAME" --instance="$INSTANCE_NAME" || echo "DB already exists"
gcloud sql users create "$DB_USER" \
  --instance="$INSTANCE_NAME" \
  --password="$DB_PASSWORD" || \
  gcloud sql users set-password "$DB_USER" --instance="$INSTANCE_NAME" --password="$DB_PASSWORD"

# 6. بناء سلسلة الاتصال الكاملة وتخزينها كسر واحد يُحقن مباشرة في Cloud Run
CONN_NAME=$(gcloud sql instances describe "$INSTANCE_NAME" --format='value(connectionName)')
echo "Connection Name: $CONN_NAME"

CONNECTION_STRING="Host=/cloudsql/$CONN_NAME;Database=$DB_NAME;Username=$DB_USER;Password=$DB_PASSWORD"
if gcloud secrets describe "$CONNECTION_STRING_SECRET" >/dev/null 2>&1; then
  printf '%s' "$CONNECTION_STRING" | gcloud secrets versions add "$CONNECTION_STRING_SECRET" --data-file=-
else
  printf '%s' "$CONNECTION_STRING" | gcloud secrets create "$CONNECTION_STRING_SECRET" --data-file=- --replication-policy=automatic
fi

# 7. توليد/استرجاع مفتاح حماية الـ API (يحمي عمليات الإضافة والحذف)
echo "[6/9] إعداد مفتاح حماية الـ API..."
if gcloud secrets describe "$API_KEY_SECRET" >/dev/null 2>&1; then
  echo "مفتاح الـ API موجود مسبقاً، سيتم إعادة استخدامه."
else
  API_KEY=$(openssl rand -hex 32)
  printf '%s' "$API_KEY" | gcloud secrets create "$API_KEY_SECRET" --data-file=- --replication-policy=automatic
fi

# 8. Build & Push Docker image using Cloud Build (No local Docker required!)
echo "[7/9] بناء ورفع Docker Image باستخدام Cloud Build..."
cd BookSearchApp
gcloud builds submit --tag "gcr.io/$PROJECT_ID/$SERVICE_NAME:latest" .
cd ..

# 9. منح حساب خدمة Cloud Run صلاحية قراءة الأسرار فقط
echo "[8/9] منح صلاحية الوصول للأسرار..."
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
RUNTIME_SA="$PROJECT_NUMBER-compute@developer.gserviceaccount.com"
for SECRET in "$CONNECTION_STRING_SECRET" "$API_KEY_SECRET"; do
  gcloud secrets add-iam-policy-binding "$SECRET" \
    --member="serviceAccount:$RUNTIME_SA" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet || true
done

# 10. Deploy to Cloud Run — لا توجد أي كلمة سر أو مفتاح مكتوب هنا إطلاقاً
echo "[9/9] النشر على Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image="gcr.io/$PROJECT_ID/$SERVICE_NAME:latest" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --add-cloudsql-instances="$CONN_NAME" \
  --set-env-vars="UseGoogleCloudSQL=true" \
  --set-secrets="ConnectionStrings__DefaultConnection=$CONNECTION_STRING_SECRET:latest,ApiKey=$API_KEY_SECRET:latest"

echo "✅ تم النشر بنجاح!"
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format='value(status.url)')
echo ""
echo "========================================"
echo " رابط التطبيق: $SERVICE_URL"
echo ""
echo " عمليات الإضافة/الحذف (POST/DELETE) تحتاج Header اسمه: X-Api-Key"
echo " لاسترجاع قيمة المفتاح في أي وقت:"
echo "   gcloud secrets versions access latest --secret=$API_KEY_SECRET"
echo "========================================"
