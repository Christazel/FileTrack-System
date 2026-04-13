const express = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");

const prisma = require("../prisma");
const { IS_PROD } = require("../config");
const { authRequired, requireRoles } = require("../middleware/auth");
const { getUserScope, isAdmin, isManager } = require("../utils/access");
const { requirePositiveIntParam } = require("../utils/params");

const router = express.Router();

router.get("/", authRequired, async (req, res) => {
  const userScope = await getUserScope(req.user.id);

  if (!userScope) {
    return res.status(401).json({ message: "User tidak ditemukan." });
  }

  if (isAdmin(userScope)) {
    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true, departmentId: true },
    });
    return res.json(users);
  }

  if (isManager(userScope)) {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { role: "ADMIN" },
          {
            departmentId: userScope.departmentId || null,
            role: { in: ["MANAGER", "STAFF"] },
          },
          { id: req.user.id },
        ],
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true, departmentId: true },
    });

    return res.json(users);
  }

  const self = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, name: true, email: true, role: true, departmentId: true },
  });

  return res.json(self ? [self] : []);
});

router.post("/", authRequired, requireRoles("ADMIN"), async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).max(80),
    email: z.string().email(),
    role: z.enum(["ADMIN", "MANAGER", "STAFF"]).default("STAFF"),
    departmentId: z.coerce.number().int().positive().optional(),
    password: z.string().min(6).optional(),
  });

  try {
    const data = schema.parse(req.body);
    const passwordHash = await bcrypt.hash(data.password || "Password123!", 10);

    const created = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        departmentId: data.departmentId || null,
        password: passwordHash,
      },
      select: { id: true, name: true, email: true, role: true, departmentId: true },
    });

    return res.status(201).json(created);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Input user tidak valid.", errors: error.issues });
    }

    if (error?.code === "P2002") {
      return res.status(409).json({ message: "Email sudah terdaftar." });
    }

    return res.status(500).json({
      message: "Gagal membuat user.",
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
    name: z.string().min(2).max(80).optional(),
    email: z.string().email().optional(),
    role: z.enum(["ADMIN", "MANAGER", "STAFF"]).optional(),
    departmentId: z.coerce.number().int().positive().nullable().optional(),
  });

  try {
    const data = schema.parse(req.body);

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.email ? { email: data.email } : {}),
        ...(data.role ? { role: data.role } : {}),
        ...(data.departmentId !== undefined ? { departmentId: data.departmentId } : {}),
      },
      select: { id: true, name: true, email: true, role: true, departmentId: true },
    });

    return res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Input update user tidak valid.", errors: error.issues });
    }

    if (error?.code === "P2002") {
      return res.status(409).json({ message: "Email sudah digunakan." });
    }

    return res.status(500).json({
      message: "Gagal update user.",
      ...(IS_PROD ? {} : { error: error.message }),
    });
  }
});

router.post("/:id/reset-password", authRequired, requireRoles("ADMIN"), async (req, res) => {
  const id = requirePositiveIntParam(req, res);
  if (!id) {
    return;
  }
  const schema = z.object({
    password: z.string().min(6).optional(),
  });

  try {
    const data = schema.parse(req.body);
    const nextPassword = data.password || "Password123!";
    const passwordHash = await bcrypt.hash(nextPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { password: passwordHash },
    });

    return res.json({ message: "Password berhasil direset." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Input reset password tidak valid.", errors: error.issues });
    }
    return res.status(500).json({
      message: "Gagal reset password.",
      ...(IS_PROD ? {} : { error: error.message }),
    });
  }
});

router.delete("/:id", authRequired, requireRoles("ADMIN"), async (req, res) => {
  const id = requirePositiveIntParam(req, res);
  if (!id) {
    return;
  }

  if (id === req.user.id) {
    return res.status(400).json({ message: "Tidak bisa menghapus akun sendiri." });
  }

  try {
    await prisma.user.delete({ where: { id } });
    return res.json({ message: "User dihapus." });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal menghapus user.",
      ...(IS_PROD ? {} : { error: error.message }),
    });
  }
});

module.exports = router;
