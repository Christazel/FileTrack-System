const express = require("express");
const path = require("path");
const { z } = require("zod");

const prisma = require("../prisma");
const upload = require("../middleware/upload");
const { authRequired, requireRoles } = require("../middleware/auth");
const { writeLog } = require("../utils/log");

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
          tags: {
            create: tagList.map((name) => ({ name })),
          },
        },
        include: {
          category: true,
          uploadedBy: { select: { id: true, name: true, role: true } },
          tags: true,
        },
      });

      await writeLog({
        userId: req.user.id,
        action: "UPLOAD_DOCUMENT",
        detail: `Upload dokumen: ${document.title}`,
        documentId: document.id,
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
