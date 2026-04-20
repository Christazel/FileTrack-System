# FileTrack System

FileTrack System adalah aplikasi web untuk menyimpan, mengelola, dan melacak dokumen perusahaan secara digital.

Repo ini berbentuk monorepo fullstack:

- `apps/web`: Frontend (React + Vite)
- `apps/api`: Backend API (Express + Prisma)
- Database lokal: MySQL via Docker (`docker-compose.yml`)

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

> Tips: Workspace sudah disiapkan `.vscode/settings.json` untuk menyembunyikan folder berat seperti `node_modules`, `dist`, dan `uploads` agar Explorer/Search lebih rapi.

## Menjalankan Project

1. Jalankan MySQL:
   ```bash
   npm run db:up
   ```
2. Setup backend:
   ```bash
   cd apps/api
   npm install
    cp .env.example .env
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

### Script cepat (root)

- `npm run dev` -> API + Web barengan
- `npm run dev:api` / `npm run dev:web`
- `npm run db:up` / `npm run db:down` / `npm run db:logs`
- `npm run prisma:migrate` / `npm run prisma:generate` / `npm run prisma:studio`
- `npm run smoke:api` -> Smoke test API (upload -> assign -> status -> comment -> version -> approve -> tracking)

Frontend: `http://localhost:5173`
Backend: `http://localhost:4000`

## Troubleshooting

### Database `filetrack` tidak muncul di phpMyAdmin

Biasanya ini karena phpMyAdmin kamu tersambung ke MySQL yang berbeda (mis. MySQL dari XAMPP/Laragon), bukan MySQL Docker dari project ini.

Checklist cepat:

1. Pastikan MySQL Docker project ini hidup:
   ```bash
   docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
   ```
   Pastikan ada container `filetrack-mysql` dan port `0.0.0.0:3306->3306/tcp`.

2. Cek apakah port `3306` bentrok (dipakai MySQL lain):
   ```bash
   netstat -ano | findstr :3306
   ```
   Jika ada proses lain memakai `3306`, hentikan service MySQL lokalnya atau ubah port mapping di `docker-compose.yml` (mis. `"3307:3306"`).

3. Cek database dari terminal (paling akurat):
   ```bash
   docker exec -it filetrack-mysql mysql -uroot -proot -e "SHOW DATABASES;"
   docker exec -it filetrack-mysql mysql -uroot -proot -e "SHOW TABLES FROM filetrack;"
   ```

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
- `POST /api/categories` (ADMIN)
- `PATCH /api/categories/:id` (ADMIN)
- `DELETE /api/categories/:id` (ADMIN)
- `GET /api/documents`
- `POST /api/documents` (ADMIN/MANAGER)
- `GET /api/documents/:id/preview`
- `GET /api/documents/:id/versions`
- `POST /api/documents/:id/versions`
- `GET /api/documents/:id/shares`
- `POST /api/documents/:id/share`
- `PATCH /api/documents/:id/assign` (ADMIN/MANAGER)
- `PATCH /api/documents/:id/status` (STAFF hanya IN_PROGRESS/DONE)
- `POST /api/documents/:id/comments`
- `GET /api/documents/:id/tracking`
- `POST /api/documents/:id/decision` (ADMIN/MANAGER)
- `GET /api/documents/:id/download`
- `PUT /api/documents/:id` (ADMIN/MANAGER)
- `DELETE /api/documents/:id` (ADMIN)
- `GET /api/users`
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`
- `GET /api/logs` (ADMIN/MANAGER)

## Smoke Test API

Jalankan ini untuk memastikan flow utama backend berjalan end-to-end.

Prasyarat:
- MySQL sudah jalan: `npm run db:up`
- API sudah jalan: `npm run dev:api`

Lalu jalankan:
```bash
npm run smoke:api
```

## Demo Data

- Seed kini mengisi user demo, kategori, dokumen contoh, versi revisi, share, notifikasi, dan log aktivitas.
- File demo PDF ada di `apps/api/uploads` untuk mendukung preview dan download saat presentasi.

## Catatan Keamanan

- JWT auth untuk semua endpoint private
- RBAC di level route
- Validasi input memakai Zod
- Validasi file upload (mime type + size limit)
