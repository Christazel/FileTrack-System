const express = require("express");
const { z } = require("zod");

const prisma = require("../prisma");
const { authRequired, requireRoles } = require("../middleware/auth");

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

router.post("/", authRequired, requireRoles("ADMIN", "MANAGER"), async (req, res) => {
  try {
    const data = categorySchema.parse(req.body);
    const category = await prisma.category.create({ data });
    return res.status(201).json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Input kategori tidak valid.", errors: error.issues });
    }
    return res.status(500).json({ message: "Gagal membuat kategori." });
  }
});

module.exports = router;
