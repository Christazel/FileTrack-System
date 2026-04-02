# FileTrack System

FileTrack System adalah web aplikasi untuk menyimpan, mengelola, dan mencari dokumen perusahaan secara digital.

## Fitur Utama

- Login + RBAC (`ADMIN`, `MANAGER`, `STAFF`)
- Upload dokumen (PDF, DOCX, XLSX, JPG, PNG) dengan validasi tipe dan batas ukuran 10MB
- Manajemen kategori dokumen
- Tag/label dokumen
- Pencarian dokumen berdasarkan nama file/judul/tag/kategori/tanggal
- Preview PDF langsung di dashboard
- Versioning dokumen untuk revisi file
- Share file antar user
- Notifikasi upload dan share
- Dashboard statistik (total dokumen, total user, dokumen terbaru)
- Aktivitas log (upload, download, update, delete, login)
- Download tracking per user
- Halaman publik landing page yang siap presentasi

## Stack

- Frontend: React + Vite + Axios
- Backend: Node.js + Express + Prisma + JWT + Multer
- Database: MySQL
- Storage: Local (`apps/api/uploads`)

## Struktur Project

- `apps/web` -> Frontend React
- `apps/api` -> Backend API
- `docker-compose.yml` -> MySQL local

## Menjalankan Project

1. Jalankan MySQL:
   ```bash
   docker compose up -d
   ```
2. Setup backend:
   ```bash
   cd apps/api
   npm install
   npx prisma migrate dev --name init
   npx prisma generate
   node prisma/seed.js
   ```
   Jika Anda ingin langsung memakai SQL migration yang sudah disiapkan, file ada di `apps/api/prisma/migrations/20260402_0001_init/migration.sql`.
3. Setup frontend:
   ```bash
   cd ../web
   npm install
   ```
4. Jalankan fullstack dari root:
   ```bash
   cd ../..
   npm install
   npm run dev
   ```

Frontend: `http://localhost:5173`
Backend: `http://localhost:4000`

## Demo User

Semua akun memakai password: `Password123!`

- `admin@filetrack.local` (ADMIN)
- `manager@filetrack.local` (MANAGER)
- `staff@filetrack.local` (STAFF)

## Endpoint Inti

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/dashboard/summary`
- `GET /api/categories`
- `POST /api/categories` (ADMIN/MANAGER)
- `GET /api/documents`
- `POST /api/documents`
- `GET /api/documents/:id/preview`
- `GET /api/documents/:id/versions`
- `POST /api/documents/:id/versions`
- `GET /api/documents/:id/shares`
- `POST /api/documents/:id/share`
- `GET /api/documents/:id/download`
- `PUT /api/documents/:id` (ADMIN/MANAGER)
- `DELETE /api/documents/:id` (ADMIN)
- `GET /api/users`
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`
- `GET /api/logs` (ADMIN/MANAGER)

## Demo Data

- Seed kini mengisi user demo, kategori, dokumen contoh, versi revisi, share, notifikasi, dan log aktivitas.
- File demo PDF ada di `apps/api/uploads` untuk mendukung preview dan download saat presentasi.

## Catatan Keamanan

- JWT auth untuk semua endpoint private
- RBAC di level route
- Validasi input memakai Zod
- Validasi file upload (mime type + size limit)
