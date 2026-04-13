const express = require("express");
const { z } = require("zod");

const prisma = require("../prisma");
const { IS_PROD } = require("../config");
const { authRequired, requireRoles } = require("../middleware/auth");
const { requirePositiveIntParam } = require("../utils/params");

const router = express.Router();

const categorySchema = z.object({
  name: z.string().min(2).max(60),
});

router.get("/", authRequired, async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });
  return res.json(categories);
});

router.post("/", authRequired, requireRoles("ADMIN"), async (req, res) => {
  try {
    const data = categorySchema.parse(req.body);
    const category = await prisma.category.create({ data });
    return res.status(201).json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Input kategori tidak valid.", errors: error.issues });
    }
    if (error?.code === "P2002") {
      return res.status(409).json({ message: "Nama kategori sudah digunakan." });
    }
    return res.status(500).json({ message: "Gagal membuat kategori." });
  }
});

router.patch("/:id", authRequired, requireRoles("ADMIN"), async (req, res) => {
  const id = requirePositiveIntParam(req, res);
  if (!id) {
    return;
  }

  try {
    const data = categorySchema.parse(req.body);
    const updated = await prisma.category.update({
      where: { id },
      data,
    });
    return res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Input kategori tidak valid.", errors: error.issues });
    }

    if (error?.code === "P2002") {
      return res.status(409).json({ message: "Nama kategori sudah digunakan." });
    }

    if (error?.code === "P2025") {
      return res.status(404).json({ message: "Kategori tidak ditemukan." });
    }

    return res.status(500).json({
      message: "Gagal mengubah kategori.",
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
    await prisma.category.delete({ where: { id } });
    return res.json({ message: "Kategori dihapus." });
  } catch (error) {
    if (error?.code === "P2025") {
      return res.status(404).json({ message: "Kategori tidak ditemukan." });
    }

    return res.status(409).json({
      message: "Kategori tidak bisa dihapus karena masih dipakai dokumen.",
      ...(IS_PROD ? {} : { error: error.message }),
    });
  }
});

module.exports = router;
