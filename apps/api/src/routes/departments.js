const express = require("express");
const { z } = require("zod");

const prisma = require("../prisma");
const { IS_PROD } = require("../config");
const { authRequired, requireRoles } = require("../middleware/auth");
const { requirePositiveIntParam } = require("../utils/params");

const router = express.Router();

router.get("/", authRequired, async (_req, res) => {
  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return res.json(departments);
});

router.post("/", authRequired, requireRoles("ADMIN"), async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).max(80),
  });

  try {
    const data = schema.parse(req.body);

    const created = await prisma.department.create({
      data: { name: data.name },
      select: { id: true, name: true },
    });

    return res.status(201).json(created);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Input department tidak valid.", errors: error.issues });
    }

    if (error?.code === "P2002") {
      return res.status(409).json({ message: "Nama department sudah ada." });
    }

    return res.status(500).json({
      message: "Gagal membuat department.",
      ...(IS_PROD ? {} : { error: error.message }),
    });
  }
});

router.patch("/:id", authRequired, requireRoles("ADMIN"), async (req, res) => {
  const id = requirePositiveIntParam(req, res);
  if (!id) {
    return;
  }
  const schema = z.object({
    name: z.string().min(2).max(80),
  });

  try {
    const data = schema.parse(req.body);

    const updated = await prisma.department.update({
      where: { id },
      data: { name: data.name },
      select: { id: true, name: true },
    });

    return res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Input department tidak valid.", errors: error.issues });
    }

    if (error?.code === "P2002") {
      return res.status(409).json({ message: "Nama department sudah digunakan." });
    }

    return res.status(500).json({
      message: "Gagal update department.",
      ...(IS_PROD ? {} : { error: error.message }),
    });
  }
});

router.delete("/:id", authRequired, requireRoles("ADMIN"), async (req, res) => {
  const id = requirePositiveIntParam(req, res);
  if (!id) {
    return;
  }

  try {
    await prisma.department.delete({ where: { id } });
    return res.json({ message: "Department dihapus." });
  } catch (error) {
    // Likely FK constraint (users/documents still reference it)
    return res.status(409).json({
      message: "Department tidak bisa dihapus karena masih dipakai.",
      ...(IS_PROD ? {} : { error: error.message }),
    });
  }
});

module.exports = router;
