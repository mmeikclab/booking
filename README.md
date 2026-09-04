# Üniversite Randevu Sistemi

Öğrencilerin ve akademisyenlerin görüşme randevularını kolayca yönetebildiği tam yığın (full-stack) web uygulaması.

## Teknolojiler

- **Frontend/Backend:** Next.js 16 (App Router) + React 19 + Tailwind CSS 4
- **Veritabanı & Kimlik doğrulama:** [Appwrite Cloud](https://cloud.appwrite.io)
- **E-posta bildirimleri:** Nodemailer (SMTP)

## Özellikler

- 🔐 Kullanıcı rolleri: **Öğrenci**, **Hoca**, **Yönetici**
- 📅 Hocalar için haftalık müsaitlik aralığı tanımlama
- 📝 Öğrencilerin uygun saati seçerek randevu talebi oluşturması
- ✅ Hocanın bekleyen talepleri onaylayıp/reddetmesi
- ✉️ Randevu oluşturma ve durum değişikliklerinde e-posta bildirimi
- 🛠️ Yönetici paneli: kullanıcı yönetimi, hoca ekleme, tüm randevular

## Kurulum

### 1. Gereksinimler

- Node.js 20+
- Appwrite Cloud hesabı (ücretsiz): https://cloud.appwrite.io

### 2. Bağımlılıkları kurun

```bash
npm install
```

### 3. Appwrite projesini hazırlayın

1. [Appwrite Console](https://cloud.appwrite.io)'da **Yeni Proje** oluşturun.
2. **Overview → API Keys** bölümünden bir API anahtarı oluşturun ve şu kapsamları verin:
   - `users.read`, `users.write`
   - `databases.read`, `databases.write`
3. `.env.local` dosyasını oluşturun (`.env.example`'ı kopyalayın) ve değerleri doldurun:

```env
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=proje_idniz
APPWRITE_API_KEY=api_anahtariniz
APPWRITE_DATABASE_ID=randevu-db
APPWRITE_PROFESSORS_COLLECTION_ID=professors
APPWRITE_AVAILABILITY_COLLECTION_ID=availability_slots
APPWRITE_APPOINTMENTS_COLLECTION_ID=appointments
```

> Dynamic koleksiyonlar, scriptle otomatik oluşturulur. Database'deki **Email/Password** auth yönteminin açık olduğundan emin olun.

### 4. Veritabanını oluşturun

```bash
npm run setup:appwrite
```

Bu komut database'i, koleksiyonları, attribute'ları ve index'leri oluşturur.

### 5. Yönetici hesabı oluşturun

Sistemde yönetici rolü kullanıcı prefs alanıyla (`role: "admin"`) belirlenir. İlk yöneticiyi Appwrite Console'dan **Auth → Users** bölümünden bir kullanıcı oluşturduktan sonra **Preferences (Prefs)** alanına ekleyin:

```json
{ "role": "admin" }
```

### 6. Geliştirme sunucusu

```bash
npm run dev
```

http://localhost:3000 adresini açın.

## E-posta bildirimleri

`.env.local` içindeki SMTP ayarlarını doldurarak Türkçe e-posta bildirimlerini etkinleştirin:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ornek@gmail.com
SMTP_PASS=uygulama_sifresi
SMTP_FROM=Randevu Sistemi <ornek@gmail.com>
```

> Gmail kullanıyorsanız hesabınızda "Uygulama şifresi" oluşturmanız gerekir. SMTP tanımlanmazsa bildirimler atlanır (uygulama çalışmaya devam eder).

## GitHub → Vercel dağıtımı

1. Bu klasörü bir GitHub deposuna push edin.
2. [Vercel](https://vercel.com)'de **Import Repository** ile bu depoyu seçin.
3. Environment Variables alanına `.env.local` içindeki tüm değerleri (özellikle `APPWRITE_PROJECT_ID` ve `APPWRITE_API_KEY`) girin.
4. **Deploy** edin.

### Appwrite CORS ayarı (önemli)

Canlı sitede API isteklerinin çalışması için Appwrite Console'dan projenize girip **Auth → Settings → Allowed Domains** (veya **Overview → Platforms**) alanına Vercel adresi olan `https://siteniz.vercel.app` ekleyin.

## API Route'ları

| Yöntem | Yol                       | Açıklama                        | Rol       |
| ------ | ------------------------- | ------------------------------- | --------- |
| POST   | `/api/auth/register`      | Kayıt + oturum                  | -         |
| POST   | `/api/auth/login`         | Giriş + oturum çerezi           | -         |
| POST   | `/api/auth/logout`        | Çıkış                           | -         |
| GET    | `/api/me`                 | Oturumdaki kullanıcı            | Girişli   |
| GET    | `/api/professors`         | Hoca listesi                    | Girişli   |
| POST   | `/api/availability`       | Müsaitlik aralığı ekle          | Hoca      |
| GET    | `/api/availability/id`    | Müsaitlik listesi               | Girişli   |
| DELETE | `/api/availability/id`    | Müsaitlik sil                   | Hoca      |
| GET    | `/api/appointments`       | Randevularım                    | Girişli   |
| POST   | `/api/appointments`       | Randevu talep et                | Öğrenci   |
| POST   | `/api/appointments/status`| Durum güncelle (onay/iptal/dolu)| Hoca/Admin|
| GET    | `/api/admin/users`        | Kullanıcı listesi               | Admin     |
| PATCH  | `/api/admin/users`        | Kullanıcı durumu                | Admin     |
| GET    | `/api/admin/professors`   | Hoca yönetimi                   | Admin     |
| POST   | `/api/admin/professors`   | Hoca oluştur                    | Admin     |
| GET    | `/api/admin/appointments` | Tüm randevular                  | Admin     |

## Scriptler

```bash
npm run dev          # geliştirme sunucusu
npm run build        # üretim derlemesi
npm run lint         # kod denetimi
npm run setup:appwrite  # Appwrite şemasını oluşturur
```