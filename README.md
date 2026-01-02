# Koperasi OS

Platform Digital Koperasi Modern dengan Arsitektur Multi-Tenant dan Kepatuhan Akuntansi SAK-EP.

## 🚀 Deployment & Testing

Aplikasi ini mendukung deployment ke berbagai environment menggunakan Docker atau Vercel.

### 1. Prerequisites
- Node.js 18+
- Docker (Optional, for containerized testing)
- Supabase Project

### 2. Environment Setup
Copy file `.env.example` menjadi `.env` dan isi variabel yang dibutuhkan:

```bash
cp .env.example .env
```

Isi variabel:
- `NEXT_PUBLIC_SUPABASE_URL`: URL Project Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anon Key Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Service Role Key (untuk API backend)
- `NEXT_PUBLIC_APP_MODE`: Set ke `production` untuk live, atau `demo` untuk mode latihan.

### 3. Local Development

```bash
npm install
npm run dev
```
Akses di `http://localhost:3000`

### 4. Docker (Testing di Environment Lain)
Untuk menjalankan aplikasi di server lain atau mesin tester tanpa setup Node.js manual:

1. **Build Image**:
   ```bash
   docker build -t koperasi-os .
   ```

2. **Run Container**:
   ```bash
   docker run -p 3000:3000 --env-file .env koperasi-os
   ```

3. Akses di `http://localhost:3000` (atau IP server).

### 5. Vercel Deployment
Project ini sudah dikonfigurasi untuk Vercel.
- Pastikan Environment Variables diinput di dashboard Vercel.
- File `.vercelignore` sudah disiapkan untuk mengoptimalkan build.

## 🧪 Testing

Jalankan test suite untuk memverifikasi fungsionalitas:

```bash
# Unit & Integration Tests
npm run test

# End-to-End Tests (Playwright)
npm run test:e2e
```
