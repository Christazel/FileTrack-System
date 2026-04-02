const express = require("express");
const path = require("path");
const { z } = require("zod");

const prisma = require("../prisma");
const upload = require("../middleware/upload");
const { authRequired, requireRoles } = require("../middleware/auth");
const { writeLog } = require("../utils/log");
const { notifyRoles, createNotification } = require("../utils/notify");

const router = express.Router();

const metadataSchema = z.object({
  title: z.string().min(2).max(150),
  categoryId: z.coerce.number().int().positive(),
  tags: z.string().optional(),
});

router.get("/", authRequired, async (req, res) => {
  const query = (req.query.q || "").toString().trim();
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
  const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom) : undefined;
  const dateTo = req.query.dateTo ? new Date(req.query.dateTo) : undefined;

  const where = {
    ...(categoryId ? { categoryId } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          },
        }
      : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query } },
            { originalName: { contains: query } },
            {
              tags: {
                some: {
                  name: { contains: query },
                },
              },
            },
          ],
        }
      : {}),
  };

  const documents = await prisma.document.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      category: true,
      uploadedBy: { select: { id: true, name: true, role: true } },
      tags: true,
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
      shares: {
        where: { sharedToId: req.user.id },
        select: { id: true, createdAt: true, readAt: true },
      },
    },
  });

  return res.json(documents);
});

router.post(
  "/",
  authRequired,
  requireRoles("ADMIN", "STAFF", "MANAGER"),
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "File wajib diunggah." });
      }

      const { title, categoryId, tags } = metadataSchema.parse(req.body);
      const tagList = (tags || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 10);

      const document = await prisma.document.create({
        data: {
          title,
          categoryId,
          originalName: req.file.originalname,
          filePath: req.file.filename,
          mimeType: req.file.mimetype,
          fileSize: req.file.size,
          uploadedById: req.user.id,
          currentVersion: 1,
          tags: {
            create: tagList.map((name) => ({ name })),
          },
          versions: {
            create: {
              versionNumber: 1,
              originalName: req.file.originalname,
              filePath: req.file.filename,
              mimeType: req.file.mimetype,
              fileSize: req.file.size,
              uploadedById: req.user.id,
            },
          },
        },
        include: {
          category: true,
          uploadedBy: { select: { id: true, name: true, role: true } },
          tags: true,
          versions: true,
        },
      });

      await writeLog({
        userId: req.user.id,
        action: "UPLOAD_DOCUMENT",
        detail: `Upload dokumen: ${document.title}`,
        documentId: document.id,
      });

      await notifyRoles({
        roles: ["ADMIN", "MANAGER"],
        documentId: document.id,
        action: "UPLOAD_DOCUMENT",
        title: `Dokumen baru diunggah: ${document.title}`,
        detail: `${req.user.name} mengunggah ${document.originalName}`,
        excludeUserId: req.user.id,
      });

      return res.status(201).json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Input dokumen tidak valid.", errors: error.issues });
      }
      return res.status(500).json({ message: "Gagal upload dokumen.", error: error.message });
    }
  },
);

router.get("/:id/download", authRequired, async (req, res) => {
  const id = Number(req.params.id);
  const document = await prisma.document.findUnique({ where: { id } });

  if (!document) {
    return res.status(404).json({ message: "Dokumen tidak ditemukan." });
  }

  await writeLog({
    userId: req.user.id,
    action: "DOWNLOAD_DOCUMENT",
    detail: `Download dokumen: ${document.title}`,
    documentId: document.id,
  });

  const fileLocation = path.resolve(__dirname, "../../uploads", document.filePath);
  return res.download(fileLocation, document.originalName);
});

router.get("/:id/preview", authRequired, async (req, res) => {
  const id = Number(req.params.id);
  const document = await prisma.document.findUnique({ where: { id } });

  if (!document) {
    return res.status(404).json({ message: "Dokumen tidak ditemukan." });
  }

  const fileLocation = path.resolve(__dirname, "../../uploads", document.filePath);
  res.setHeader("Content-Type", document.mimeType || "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${document.originalName}"`);
  return res.sendFile(fileLocation);
});

router.get("/:id/versions", authRequired, async (req, res) => {
  const id = Number(req.params.id);
  const versions = await prisma.documentVersion.findMany({
    where: { documentId: id },
    orderBy: { versionNumber: "desc" },
    include: {
      uploadedBy: { select: { id: true, name: true, role: true } },
    },
  });

  return res.json(versions);
});

router.post(
  "/:id/versions",
  authRequired,
  requireRoles("ADMIN", "STAFF", "MANAGER"),
  upload.single("file"),
  async (req, res) => {
    const id = Number(req.params.id);

    try {
      const existing = await prisma.document.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ message: "Dokumen tidak ditemukan." });
      }

      if (!req.file) {
        return res.status(400).json({ message: "File wajib diunggah." });
      }

      const nextVersion = existing.currentVersion + 1;

      const updated = await prisma.document.update({
        where: { id },
        data: {
          originalName: req.file.originalname,
          filePath: req.file.filename,
          mimeType: req.file.mimetype,
          fileSize: req.file.size,
          currentVersion: nextVersion,
          versions: {
            create: {
              versionNumber: nextVersion,
              originalName: req.file.originalname,
              filePath: req.file.filename,
              mimeType: req.file.mimetype,
              fileSize: req.file.size,
              uploadedById: req.user.id,
            },
          },
        },
        include: {
          category: true,
          uploadedBy: { select: { id: true, name: true, role: true } },
          tags: true,
          versions: true,
        },
      });

      await writeLog({
        userId: req.user.id,
        action: "ADD_DOCUMENT_VERSION",
        detail: `Tambah versi ${nextVersion} untuk ${updated.title}`,
        documentId: updated.id,
      });

      await notifyRoles({
        roles: ["ADMIN", "MANAGER"],
        documentId: updated.id,
        action: "ADD_DOCUMENT_VERSION",
        title: `Versi baru untuk ${updated.title}`,
        detail: `${req.user.name} menambahkan versi ${nextVersion}`,
        excludeUserId: req.user.id,
      });

      return res.status(201).json(updated);
    } catch (error) {
      return res.status(500).json({ message: "Gagal menambah versi dokumen.", error: error.message });
    }
  },
);

router.post("/:id/share", authRequired, async (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({
    sharedToId: z.coerce.number().int().positive(),
    message: z.string().max(250).optional(),
  });

  try {
    const data = schema.parse(req.body);
    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return res.status(404).json({ message: "Dokumen tidak ditemukan." });
    }

    const canShare = req.user.role === "ADMIN" || req.user.role === "MANAGER" || document.uploadedById === req.user.id;
    if (!canShare) {
      return res.status(403).json({ message: "Anda tidak memiliki akses untuk membagikan dokumen ini." });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: data.sharedToId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!targetUser) {
      return res.status(404).json({ message: "User tujuan tidak ditemukan." });
    }

    const shared = await prisma.documentShare.create({
      data: {
        documentId: document.id,
        sharedById: req.user.id,
        sharedToId: targetUser.id,
        message: data.message || null,
      },
      include: {
        document: true,
        sharedBy: { select: { id: true, name: true, role: true } },
        sharedTo: { select: { id: true, name: true, role: true } },
      },
    });

    await createNotification({
      userId: targetUser.id,
      documentId: document.id,
      action: "SHARE_DOCUMENT",
      title: `Dokumen dibagikan: ${document.title}`,
      detail: data.message || `${req.user.name} membagikan dokumen kepada Anda`,
    });

    await writeLog({
      userId: req.user.id,
      action: "SHARE_DOCUMENT",
      detail: `Bagikan ${document.title} ke ${targetUser.name}`,
      documentId: document.id,
    });

    return res.status(201).json(shared);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Input share tidak valid.", errors: error.issues });
    }
    return res.status(500).json({ message: "Gagal membagikan dokumen.", error: error.message });
  }
});

router.put("/:id", authRequired, requireRoles("ADMIN", "MANAGER"), async (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({
    title: z.string().min(2).max(150).optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    tags: z.array(z.string().min(1).max(30)).optional(),
  });

  try {
    const data = schema.parse(req.body);

    const updated = await prisma.document.update({
      where: { id },
      data: {
        ...(data.title ? { title: data.title } : {}),
        ...(data.categoryId ? { categoryId: data.categoryId } : {}),
        ...(data.tags
          ? {
              tags: {
                deleteMany: {},
                create: data.tags.map((name) => ({ name })),
              },
            }
          : {}),
      },
      include: {
        category: true,
        uploadedBy: { select: { id: true, name: true, role: true } },
        tags: true,
      },
    });

    await writeLog({
      userId: req.user.id,
      action: "UPDATE_DOCUMENT",
      detail: `Update dokumen: ${updated.title}`,
      documentId: updated.id,
    });

    return res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Input update tidak valid.", errors: error.issues });
    }
    return res.status(500).json({ message: "Gagal update dokumen.", error: error.message });
  }
});

router.get("/:id/shares", authRequired, async (req, res) => {
  const id = Number(req.params.id);

  const shares = await prisma.documentShare.findMany({
    where: { documentId: id },
    orderBy: { createdAt: "desc" },
    include: {
      sharedBy: { select: { id: true, name: true, role: true } },
      sharedTo: { select: { id: true, name: true, role: true } },
    },
  });

  return res.json(shares);
});

router.delete("/:id", authRequired, requireRoles("ADMIN"), async (req, res) => {
  const id = Number(req.params.id);

  try {
    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Dokumen tidak ditemukan." });
    }

    await prisma.document.delete({ where: { id } });

    await writeLog({
      userId: req.user.id,
      action: "DELETE_DOCUMENT",
      detail: `Hapus dokumen: ${existing.title}`,
      documentId: id,
    });

    return res.json({ message: "Dokumen dihapus." });
  } catch (error) {
    return res.status(500).json({ message: "Gagal hapus dokumen.", error: error.message });
  }
});

module.exports = router;
