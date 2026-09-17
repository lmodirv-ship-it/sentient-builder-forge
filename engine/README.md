# محرك نواة — التثبيت على خادم VPS 66

المحرك خدمة Node واحدة تحتوي: الوكيل المركزي، سجل الأدوات، طبقة التشغيل الموحّدة (Windows/Linux)، الذاكرة والبحث، طابور المهام، والقوالب.

## 1) تجهيز الخادم

```bash
sudo apt update && sudo apt install -y nodejs npm postgresql nginx certbot python3-certbot-nginx
sudo -u postgres createuser nawat --pwprompt
sudo -u postgres createdb nawat --owner nawat
sudo mkdir -p /var/lib/nawat/storage && sudo chown -R nawat /var/lib/nawat
```

## 2) نسخ المحرك

```bash
sudo mkdir -p /opt/nawat-engine
sudo rsync -a engine/ /opt/nawat-engine/
cd /opt/nawat-engine
cp .env.example .env    # ثم عدّل القيم
npm install
node src/migrate.mjs
```

## 3) التشغيل الدائم

```bash
sudo cp deploy/nawat-engine.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now nawat-engine
sudo systemctl status nawat-engine
```

## 4) النطاق والشهادة

وجّه `api.hn-chat.com` إلى `213.156.132.166` ثم:

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/nawat-engine
sudo ln -s /etc/nginx/sites-available/nawat-engine /etc/nginx/sites-enabled/
sudo certbot --nginx -d api.hn-chat.com
sudo nginx -t && sudo systemctl reload nginx
```

## 5) التحقق

```bash
curl https://api.hn-chat.com/v1/health
curl -X POST https://api.hn-chat.com/v1/ask -H 'content-type: application/json' -d '{"text":"من انت"}'
```

## 6) ربط الواجهة

في مشروع الواجهة، اضبط:

```
VITE_ENGINE_URL=https://api.hn-chat.com
```

عندها تصبح الواجهة عرضًا فقط: ترسل الطلب للمحرك، وتتابع حالة المهمة، وتعرض النتيجة. وتطبيق الهاتف يفتح الموقع نفسه فيحصل على النتائج ذاتها.

## 7) نقل البيانات

القوالب الحالية (S00001 فما فوق) تُصدَّر من قاعدة البيانات الحالية وتُستورد كما هي:

```bash
psql "$DATABASE_URL" -c "\copy templates(code,title,body,kind) FROM 'templates.csv' CSV HEADER"
```

لا يُحذف شيء من القاعدة الحالية — تبقى نسخة مرجعية.

## نقاط العقد

| النقطة | الدور |
|---|---|
| `POST /v1/ask` | سؤال النواة: قالب فوري، أو أداة، أو مهمة، أو ذاكرة + نموذج |
| `POST /v1/jobs` | فتح مهمة إنشاء (صورة، صوت، فيديو، موقع، سيرة، تحليل صورة) |
| `GET /v1/jobs/:id` | حالة المهمة ونتيجتها وملفها |
| `GET /v1/tools` و`POST /v1/tools/:id/run` | سجل الأدوات وتنفيذها عبر الطبقة الموحّدة |
| `GET /v1/templates` و`PUT /v1/templates/:code` | قراءة وتعديل القوالب |
| `GET /v1/admin/overview` و`/v1/admin/logs` | بيانات لوحة التحكم |
