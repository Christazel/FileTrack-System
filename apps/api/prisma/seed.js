const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 10);

  await prisma.log.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.documentShare.deleteMany();
  await prisma.documentVersion.deleteMany();
  await prisma.documentTag.deleteMany();
  await prisma.document.deleteMany();

  const users = [
    { name: "Admin Utama", email: "admin@filetrack.local", role: "ADMIN" },
    { name: "Maya Suryani", email: "manager@filetrack.local", role: "MANAGER" },
    { name: "Raka Pratama", email: "staff@filetrack.local", role: "STAFF" },
    { name: "Nadia Putri", email: "legal@filetrack.local", role: "STAFF" },
    { name: "Bima Kurnia", email: "finance@filetrack.local", role: "STAFF" },
  ];

  const createdUsers = [];
  for (const user of users) {
    const savedUser = await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, password: passwordHash },
      create: { ...user, password: passwordHash },
    });
    createdUsers.push(savedUser);
  }

  const categories = ["Kontrak", "Keuangan", "Legal", "Operasional", "HR", "Compliance"];
  const createdCategories = [];

  for (const name of categories) {
    const category = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    createdCategories.push(category);
  }

  const [admin, manager, staff, legal, finance] = createdUsers;
  const [contractCategory, financeCategory, legalCategory, operationsCategory, hrCategory, complianceCategory] = createdCategories;

  const demoDocuments = [
    {
      title: "Kontrak Vendor PT Nusantara",
      originalName: "kontrak-vendor-pt-nusantara.pdf",
      filePath: "demo-kontrak-vendor-pt-nusantara.pdf",
      mimeType: "application/pdf",
      fileSize: 248_900,
      currentVersion: 2,
      categoryId: contractCategory.id,
      uploadedById: manager.id,
      tags: ["vendor", "kontrak", "2026"],
    },
    {
      title: "Laporan Keuangan Q1 2026",
      originalName: "laporan-keuangan-q1-2026.pdf",
      filePath: "demo-laporan-keuangan-q1-2026.pdf",
      mimeType: "application/pdf",
      fileSize: 381_220,
      currentVersion: 1,
      categoryId: financeCategory.id,
      uploadedById: finance.id,
      tags: ["finance", "q1", "audit"],
    },
    {
      title: "SOP Onboarding Karyawan",
      originalName: "sop-onboarding-karyawan.pdf",
      filePath: "demo-sop-onboarding-karyawan.pdf",
      mimeType: "application/pdf",
      fileSize: 172_430,
      currentVersion: 3,
      categoryId: hrCategory.id,
      uploadedById: staff.id,
      tags: ["hr", "sop", "onboarding"],
    },
    {
      title: "Checklist Compliance Internal",
      originalName: "checklist-compliance-internal.pdf",
      filePath: "demo-checklist-compliance-internal.pdf",
      mimeType: "application/pdf",
      fileSize: 201_100,
      currentVersion: 1,
      categoryId: complianceCategory.id,
      uploadedById: legal.id,
      tags: ["compliance", "audit", "internal"],
    },
    {
      title: "Rencana Operasional Bulanan",
      originalName: "rencana-operasional-bulanan.pdf",
      filePath: "demo-rencana-operasional-bulanan.pdf",
      mimeType: "application/pdf",
      fileSize: 224_560,
      currentVersion: 1,
      categoryId: operationsCategory.id,
      uploadedById: manager.id,
      tags: ["operasional", "planning"],
    },
  ];

  const createdDocuments = [];
  for (const doc of demoDocuments) {
    const createdDocument = await prisma.document.create({
      data: {
        title: doc.title,
        originalName: doc.originalName,
        filePath: doc.filePath,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        currentVersion: doc.currentVersion,
        uploadedById: doc.uploadedById,
        categoryId: doc.categoryId,
        tags: {
          create: doc.tags.map((name) => ({ name })),
        },
      },
    });

    createdDocuments.push(createdDocument);
  }

  await prisma.documentVersion.createMany({
    data: [
      {
        documentId: createdDocuments[0].id,
        versionNumber: 1,
        originalName: "kontrak-vendor-pt-nusantara-v1.pdf",
        filePath: "demo-kontrak-vendor-pt-nusantara-v1.pdf",
        mimeType: "application/pdf",
        fileSize: 241_000,
        uploadedById: manager.id,
      },
      {
        documentId: createdDocuments[0].id,
        versionNumber: 2,
        originalName: "kontrak-vendor-pt-nusantara.pdf",
        filePath: "demo-kontrak-vendor-pt-nusantara.pdf",
        mimeType: "application/pdf",
        fileSize: 248_900,
        uploadedById: manager.id,
      },
      {
        documentId: createdDocuments[2].id,
        versionNumber: 1,
        originalName: "sop-onboarding-karyawan-v1.pdf",
        filePath: "demo-sop-onboarding-karyawan-v1.pdf",
        mimeType: "application/pdf",
        fileSize: 160_000,
        uploadedById: staff.id,
      },
      {
        documentId: createdDocuments[2].id,
        versionNumber: 2,
        originalName: "sop-onboarding-karyawan-v2.pdf",
        filePath: "demo-sop-onboarding-karyawan-v2.pdf",
        mimeType: "application/pdf",
        fileSize: 168_500,
        uploadedById: staff.id,
      },
      {
        documentId: createdDocuments[2].id,
        versionNumber: 3,
        originalName: "sop-onboarding-karyawan.pdf",
        filePath: "demo-sop-onboarding-karyawan.pdf",
        mimeType: "application/pdf",
        fileSize: 172_430,
        uploadedById: staff.id,
      },
    ],
  });

  await prisma.documentShare.createMany({
    data: [
      {
        documentId: createdDocuments[0].id,
        sharedById: manager.id,
        sharedToId: admin.id,
        message: "Mohon review final sebelum pengiriman ke vendor.",
      },
      {
        documentId: createdDocuments[1].id,
        sharedById: finance.id,
        sharedToId: manager.id,
        message: "Laporan ini siap dipakai untuk rapat mingguan.",
      },
      {
        documentId: createdDocuments[2].id,
        sharedById: staff.id,
        sharedToId: legal.id,
        message: "Tolong cek pasal onboarding terbaru.",
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: admin.id,
        documentId: createdDocuments[0].id,
        action: "UPLOAD_DOCUMENT",
        title: "Dokumen baru diunggah: Kontrak Vendor PT Nusantara",
        detail: "Maya Suryani mengunggah revisi kontrak final.",
      },
      {
        userId: manager.id,
        documentId: createdDocuments[1].id,
        action: "SHARE_DOCUMENT",
        title: "Dokumen dibagikan: Laporan Keuangan Q1 2026",
        detail: "Bima Kurnia membagikan laporan untuk review.",
      },
      {
        userId: legal.id,
        documentId: createdDocuments[2].id,
        action: "SHARE_DOCUMENT",
        title: "Dokumen dibagikan: SOP Onboarding Karyawan",
        detail: "Raka Pratama meminta review legal.",
      },
      {
        userId: finance.id,
        documentId: createdDocuments[1].id,
        action: "ADD_DOCUMENT_VERSION",
        title: "Versi baru tersedia: Laporan Keuangan Q1 2026",
        detail: "File siap diunduh untuk rapat pimpinan.",
      },
    ],
  });

  await prisma.log.createMany({
    data: [
      {
        userId: manager.id,
        documentId: createdDocuments[0].id,
        action: "UPLOAD_DOCUMENT",
        detail: "Upload kontrak vendor revisi final",
      },
      {
        userId: staff.id,
        documentId: createdDocuments[2].id,
        action: "ADD_DOCUMENT_VERSION",
        detail: "Tambah revisi SOP onboarding",
      },
      {
        userId: finance.id,
        documentId: createdDocuments[1].id,
        action: "SHARE_DOCUMENT",
        detail: "Bagikan laporan ke manajer",
      },
      {
        userId: admin.id,
        action: "LOGIN",
        detail: "Admin login ke sistem demo",
      },
    ],
  });

  console.log("Seed selesai. Gunakan password: Password123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
