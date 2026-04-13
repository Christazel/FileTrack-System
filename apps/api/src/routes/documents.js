const express = require("express");
const fs = require("fs");
const path = require("path");
const { z } = require("zod");

const prisma = require("../prisma");
const { IS_PROD } = require("../config");
const upload = require("../middleware/upload");
const { authRequired, requireRoles } = require("../middleware/auth");
const { writeLog } = require("../utils/log");
const { notifyRoles, createNotification } = require("../utils/notify");
const { getUserScope, buildDocumentAccessWhere, findDocumentWithAccess, isAdmin, isManager, isStaff } = require("../utils/access");
const { requirePositiveIntParam } = require("../utils/params");

const router = express.Router();

const metadataSchema = z.object({
  title: z.string().min(2).max(150),
  categoryId: z.coerce.number().int().positive(),
  tags: z.string().optional(),
  departmentId: z.coerce.number().int().positive().optional(),
});


function parseDateQuery(value) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

router.get("/", authRequired, async (req, res) => {
  const query = (req.query.q || "").toString().trim();
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
  const dateFrom = parseDateQuery(req.query.dateFrom);
  const dateTo = parseDateQuery(req.query.dateTo);

  if (dateFrom === null || dateTo === null) {
    return res.status(400).json({ message: "Format tanggal tidak valid." });
  }

  const userScope = await getUserScope(req.user.id);
  const accessWhere = buildDocumentAccessWhere({ user: req.user, userScope });

  const where = {
    ...accessWhere,
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
      department: true,
      assignedTo: { select: { id: true, name: true, role: true } },
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
  requireRoles("ADMIN", "MANAGER"),
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "File wajib diunggah." });
      }

      const userScope = await getUserScope(req.user.id);
      if (!userScope || (!isAdmin(userScope) && !isManager(userScope))) {
        return res.status(403).json({ message: "Akses ditolak." });
      }

      const { title, categoryId, tags, departmentId } = metadataSchema.parse(req.body);
      const tagList = (tags || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 10);

      const resolvedDepartmentId = isManager(userScope)
        ? userScope.departmentId
        : departmentId || userScope.departmentId || null;

      if (isManager(userScope) && !resolvedDepartmentId) {
        return res.status(400).json({ message: "Manager wajib memiliki departemen." });
      }

      const document = await prisma.document.create({
        data: {
          title,
          categoryId,
          departmentId: resolvedDepartmentId,
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
          department: true,
          assignedTo: { select: { id: true, name: true, role: true } },
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
      return res.status(500).json({
        message: "Gagal upload dokumen.",
        ...(IS_PROD ? {} : { error: error.message }),
      });
    }
  },
);

router.get("/:id/download", authRequired, async (req, res) => {
  const id = requirePositiveIntParam(req, res);
  if (!id) {
    return;
  }
  const userScope = await getUserScope(req.user.id);
  const document = await findDocumentWithAccess({ documentId: id, user: req.user, userScope });

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
  if (!fs.existsSync(fileLocation)) {
    return res.status(404).json({ message: "File dokumen tidak ditemukan di server." });
  }

  return res.download(fileLocation, document.originalName, (error) => {
    if (!error) {
      return;
    }

    if (res.headersSent) {
      return;
    }

    const status = error.code === "ENOENT" ? 404 : 500;
    return res.status(status).json({
      message: status === 404 ? "File dokumen tidak ditemukan di server." : "Gagal download dokumen.",
    });
  });
});

router.get("/:id/preview", authRequired, async (req, res) => {
  const id = requirePositiveIntParam(req, res);
  if (!id) {
    return;
  }
  const userScope = await getUserScope(req.user.id);
  const document = await findDocumentWithAccess({ documentId: id, user: req.user, userScope });

  if (!document) {
    return res.status(404).json({ message: "Dokumen tidak ditemukan." });
  }

  const fileLocation = path.resolve(__dirname, "../../uploads", document.filePath);
  if (!fs.existsSync(fileLocation)) {
    return res.status(404).json({ message: "File dokumen tidak ditemukan di server." });
  }

  res.setHeader("Content-Type", document.mimeType || "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${document.originalName}"`);
  return res.sendFile(fileLocation, (error) => {
    if (!error) {
      return;
    }

    if (res.headersSent) {
      return;
    }

    const status = error.code === "ENOENT" ? 404 : 500;
    return res.status(status).json({
      message: status === 404 ? "File dokumen tidak ditemukan di server." : "Gagal memuat preview dokumen.",
    });
  });
});

router.get("/:id/versions", authRequired, async (req, res) => {
  const id = requirePositiveIntParam(req, res);
  if (!id) {
    return;
  }

  const userScope = await getUserScope(req.user.id);
  const document = await findDocumentWithAccess({ documentId: id, user: req.user, userScope });
  if (!document) {
    return res.status(404).json({ message: "Dokumen tidak ditemukan." });
  }

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
    const id = requirePositiveIntParam(req, res);
    if (!id) {
      return;
    }

    try {
      const userScope = await getUserScope(req.user.id);
      const existing = await findDocumentWithAccess({ documentId: id, user: req.user, userScope });
      if (!existing) {
        return res.status(404).json({ message: "Dokumen tidak ditemukan." });
      }

      if (isStaff(userScope) && existing.assignedToId !== req.user.id) {
        const shared = await prisma.documentShare.findFirst({
          where: { documentId: id, sharedToId: req.user.id },
          select: { id: true },
        });
        if (!shared && existing.uploadedById !== req.user.id) {
          return res.status(403).json({ message: "Anda tidak memiliki akses untuk mengubah dokumen ini." });
        }
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
          workflowStatus: "IN_PROGRESS",
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
          department: true,
          assignedTo: { select: { id: true, name: true, role: true } },
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
      return res.status(500).json({
        message: "Gagal menambah versi dokumen.",
        ...(IS_PROD ? {} : { error: error.message }),
      });
    }
  },
);

router.post("/:id/share", authRequired, requireRoles("ADMIN", "MANAGER"), async (req, res) => {
  const id = requirePositiveIntParam(req, res);
  if (!id) {
    return;
  }
  const schema = z.object({
    sharedToId: z.coerce.number().int().positive(),
    message: z.string().max(250).optional(),
  });

  try {
    const data = schema.parse(req.body);
    const userScope = await getUserScope(req.user.id);
    const document = await findDocumentWithAccess({ documentId: id, user: req.user, userScope });
    if (!document) {
      return res.status(404).json({ message: "Dokumen tidak ditemukan." });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: data.sharedToId },
      select: { id: true, name: true, email: true, role: true, departmentId: true },
    });

    if (!targetUser) {
      return res.status(404).json({ message: "User tujuan tidak ditemukan." });
    }

    if (isManager(userScope)) {
      if (!userScope.departmentId) {
        return res.status(400).json({ message: "Manager wajib memiliki departemen." });
      }

      if (document.departmentId !== userScope.departmentId) {
        return res.status(403).json({ message: "Anda hanya bisa share dokumen departemen Anda." });
      }

      const isTargetAllowed =
        targetUser.role === "ADMIN" ||
        (targetUser.departmentId && targetUser.departmentId === userScope.departmentId);

      if (!isTargetAllowed) {
        return res.status(403).json({ message: "User tujuan harus berada di departemen yang sama (atau admin)." });
      }
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
    return res.status(500).json({
      message: "Gagal membagikan dokumen.",
      ...(IS_PROD ? {} : { error: error.message }),
    });
  }
});

router.patch("/:id/assign", authRequired, requireRoles("ADMIN", "MANAGER"), async (req, res) => {
  const id = requirePositiveIntParam(req, res);
  if (!id) {
    return;
  }
  const schema = z.object({
    assignedToId: z.coerce.number().int().positive(),
  });

  try {
    const data = schema.parse(req.body);

    const userScope = await getUserScope(req.user.id);
    if (!userScope || (!isAdmin(userScope) && !isManager(userScope))) {
      return res.status(403).json({ message: "Akses ditolak." });
    }

    const document = await findDocumentWithAccess({
      documentId: id,
      user: req.user,
      userScope,
    });

    if (!document) {
      return res.status(404).json({ message: "Dokumen tidak ditemukan." });
    }

    const assignee = await prisma.user.findUnique({
      where: { id: data.assignedToId },
      select: { id: true, name: true, role: true, departmentId: true },
    });

    if (!assignee) {
      return res.status(404).json({ message: "User tujuan tidak ditemukan." });
    }

    if (assignee.role !== "STAFF") {
      return res.status(400).json({ message: "Dokumen hanya dapat di-assign ke staff." });
    }

    if (isManager(userScope)) {
      if (!userScope.departmentId) {
        return res.status(400).json({ message: "Manager wajib memiliki departemen." });
      }
      if (assignee.departmentId !== userScope.departmentId) {
        return res.status(403).json({ message: "Staff harus berada di departemen yang sama." });
      }
      if (document.departmentId !== userScope.departmentId) {
        return res.status(403).json({ message: "Akses ditolak." });
      }
    }

    const updated = await prisma.document.update({
      where: { id: document.id },
      data: {
        assignedToId: assignee.id,
        workflowStatus: "ASSIGNED",
        approvalStatus: "PENDING",
      },
      include: {
        category: true,
        department: true,
        assignedTo: { select: { id: true, name: true, role: true } },
        uploadedBy: { select: { id: true, name: true, role: true } },
        tags: true,
      },
    });

    await writeLog({
      userId: req.user.id,
      action: "ASSIGN_DOCUMENT",
      detail: `Assign dokumen ke ${assignee.name}`,
      documentId: updated.id,
    });

    await createNotification({
      userId: assignee.id,
      documentId: updated.id,
      action: "ASSIGN_DOCUMENT",
      title: `Dokumen ditugaskan: ${updated.title}`,
      detail: `${req.user.name} menugaskan dokumen untuk diproses.`,
    });

    return res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Input assign tidak valid.", errors: error.issues });
    }
    return res.status(500).json({
      message: "Gagal assign dokumen.",
      ...(IS_PROD ? {} : { error: error.message }),
    });
  }
});

router.patch("/:id/status", authRequired, async (req, res) => {
  const id = requirePositiveIntParam(req, res);
  if (!id) {
    return;
  }
  const schema = z.object({
    workflowStatus: z.enum(["CREATED", "ASSIGNED", "IN_PROGRESS", "DONE"]),
  });

  try {
    const data = schema.parse(req.body);

    const userScope = await getUserScope(req.user.id);
    const document = await findDocumentWithAccess({
      documentId: id,
      user: req.user,
      userScope,
    });

    if (!document) {
      return res.status(404).json({ message: "Dokumen tidak ditemukan." });
    }

    if (isStaff(userScope)) {
      if (document.assignedToId !== req.user.id) {
        return res.status(403).json({ message: "Dokumen ini tidak ditugaskan ke Anda." });
      }
      if (!["IN_PROGRESS", "DONE"].includes(data.workflowStatus)) {
        return res.status(403).json({ message: "Staff hanya dapat mengubah status ke IN_PROGRESS atau DONE." });
      }
    }

    const updated = await prisma.document.update({
      where: { id: document.id },
      data: { workflowStatus: data.workflowStatus },
      include: {
        category: true,
        department: true,
        assignedTo: { select: { id: true, name: true, role: true } },
        uploadedBy: { select: { id: true, name: true, role: true } },
        tags: true,
      },
    });

    await writeLog({
      userId: req.user.id,
      action: "UPDATE_WORKFLOW_STATUS",
      detail: `Ubah status ke ${data.workflowStatus}`,
      documentId: updated.id,
    });

    if (updated.uploadedById && updated.uploadedById !== req.user.id) {
      await createNotification({
        userId: updated.uploadedById,
        documentId: updated.id,
        action: "UPDATE_WORKFLOW_STATUS",
        title: `Status diperbarui: ${updated.title}`,
        detail: `${req.user.name} mengubah status ke ${data.workflowStatus}.`,
      });
    }

    return res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Input status tidak valid.", errors: error.issues });
    }
    return res.status(500).json({
      message: "Gagal update status.",
      ...(IS_PROD ? {} : { error: error.message }),
    });
  }
});

router.post("/:id/decision", authRequired, requireRoles("ADMIN", "MANAGER"), async (req, res) => {
  const id = requirePositiveIntParam(req, res);
  if (!id) {
    return;
  }
  const schema = z.object({
    approvalStatus: z.enum(["APPROVED", "REJECTED"]),
    note: z.string().max(250).optional(),
  });

  try {
    const data = schema.parse(req.body);

    const userScope = await getUserScope(req.user.id);
    if (!userScope || (!isAdmin(userScope) && !isManager(userScope))) {
      return res.status(403).json({ message: "Akses ditolak." });
    }

    const document = await findDocumentWithAccess({
      documentId: id,
      user: req.user,
      userScope,
      include: { assignedTo: { select: { id: true, name: true, role: true } } },
    });

    if (!document) {
      return res.status(404).json({ message: "Dokumen tidak ditemukan." });
    }

    const updated = await prisma.document.update({
      where: { id: document.id },
      data: { approvalStatus: data.approvalStatus },
      include: {
        category: true,
        department: true,
        assignedTo: { select: { id: true, name: true, role: true } },
        uploadedBy: { select: { id: true, name: true, role: true } },
        tags: true,
      },
    });

    const action = data.approvalStatus === "APPROVED" ? "APPROVE_DOCUMENT" : "REJECT_DOCUMENT";
    await writeLog({
      userId: req.user.id,
      action,
      detail: data.note ? `Keputusan: ${data.approvalStatus} • ${data.note}` : `Keputusan: ${data.approvalStatus}`,
      documentId: updated.id,
    });

    if (updated.assignedToId) {
      await createNotification({
        userId: updated.assignedToId,
        documentId: updated.id,
        action,
        title: `Keputusan dokumen: ${updated.title}`,
        detail: data.note || `${req.user.name} menetapkan ${data.approvalStatus}.`,
      });
    }

    if (updated.uploadedById && updated.uploadedById !== req.user.id) {
      await createNotification({
        userId: updated.uploadedById,
        documentId: updated.id,
        action,
        title: `Keputusan dokumen: ${updated.title}`,
        detail: data.note || `${req.user.name} menetapkan ${data.approvalStatus}.`,
      });
    }

    return res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Input keputusan tidak valid.", errors: error.issues });
    }
    return res.status(500).json({
      message: "Gagal menyimpan keputusan.",
      ...(IS_PROD ? {} : { error: error.message }),
    });
  }
});

router.get("/:id/tracking", authRequired, async (req, res) => {
  const id = requirePositiveIntParam(req, res);
  if (!id) {
    return;
  }

  const userScope = await getUserScope(req.user.id);
  const document = await findDocumentWithAccess({
    documentId: id,
    user: req.user,
    userScope,
    include: {
      category: true,
      department: true,
      assignedTo: { select: { id: true, name: true, role: true } },
      uploadedBy: { select: { id: true, name: true, role: true } },
      tags: true,
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          uploadedBy: { select: { id: true, name: true, role: true } },
        },
      },
      shares: {
        orderBy: { createdAt: "desc" },
        include: {
          sharedBy: { select: { id: true, name: true, role: true } },
          sharedTo: { select: { id: true, name: true, role: true } },
        },
      },
      comments: {
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { id: true, name: true, role: true } },
        },
      },
      logs: {
        orderBy: { timestamp: "desc" },
        take: 50,
        include: {
          user: { select: { id: true, name: true, role: true } },
        },
      },
    },
  });

  if (!document) {
    return res.status(404).json({ message: "Dokumen tidak ditemukan." });
  }

  return res.json(document);
});

router.get("/:id/comments", authRequired, async (req, res) => {
  const id = requirePositiveIntParam(req, res);
  if (!id) {
    return;
  }

  const userScope = await getUserScope(req.user.id);
  const document = await findDocumentWithAccess({ documentId: id, user: req.user, userScope });
  if (!document) {
    return res.status(404).json({ message: "Dokumen tidak ditemukan." });
  }

  const comments = await prisma.documentComment.findMany({
    where: { documentId: id },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true, role: true } },
    },
  });

  return res.json(comments);
});

router.post("/:id/comments", authRequired, async (req, res) => {
  const id = requirePositiveIntParam(req, res);
  if (!id) {
    return;
  }
  const schema = z.object({
    message: z.string().min(1).max(1000),
  });

  try {
    const data = schema.parse(req.body);

    const userScope = await getUserScope(req.user.id);
    const document = await findDocumentWithAccess({ documentId: id, user: req.user, userScope });
    if (!document) {
      return res.status(404).json({ message: "Dokumen tidak ditemukan." });
    }

    const comment = await prisma.documentComment.create({
      data: {
        documentId: id,
        authorId: req.user.id,
        message: data.message,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    await writeLog({
      userId: req.user.id,
      action: "ADD_COMMENT",
      detail: "Tambah komentar",
      documentId: id,
    });

    return res.status(201).json(comment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Input komentar tidak valid.", errors: error.issues });
    }
    return res.status(500).json({
      message: "Gagal menambah komentar.",
      ...(IS_PROD ? {} : { error: error.message }),
    });
  }
});

router.put("/:id", authRequired, requireRoles("ADMIN", "MANAGER"), async (req, res) => {
  const id = requirePositiveIntParam(req, res);
  if (!id) {
    return;
  }
  const schema = z.object({
    title: z.string().min(2).max(150).optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    tags: z.array(z.string().min(1).max(30)).optional(),
  });

  try {
    const data = schema.parse(req.body);

    const userScope = await getUserScope(req.user.id);
    const existing = await findDocumentWithAccess({ documentId: id, user: req.user, userScope });
    if (!existing) {
      return res.status(404).json({ message: "Dokumen tidak ditemukan." });
    }

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
    return res.status(500).json({
      message: "Gagal update dokumen.",
      ...(IS_PROD ? {} : { error: error.message }),
    });
  }
});

router.get("/:id/shares", authRequired, async (req, res) => {
  const id = requirePositiveIntParam(req, res);
  if (!id) {
    return;
  }

  const userScope = await getUserScope(req.user.id);
  const document = await findDocumentWithAccess({ documentId: id, user: req.user, userScope });
  if (!document) {
    return res.status(404).json({ message: "Dokumen tidak ditemukan." });
  }

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
  const id = requirePositiveIntParam(req, res);
  if (!id) {
    return;
  }

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
    return res.status(500).json({
      message: "Gagal hapus dokumen.",
      ...(IS_PROD ? {} : { error: error.message }),
    });
  }
});

module.exports = router;
