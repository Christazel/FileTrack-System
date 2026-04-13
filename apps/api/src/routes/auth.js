const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");

const prisma = require("../prisma");
const { IS_PROD } = require("../config");
const { authRequired } = require("../middleware/auth");
const { writeLog } = require("../utils/log");

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { department: { select: { id: true, name: true } } },
    });
    if (!user) {
      return res.status(401).json({ message: "Email atau password salah." });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Email atau password salah." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    await writeLog({
      userId: user.id,
      action: "LOGIN",
      detail: "User login ke sistem",
    });

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
        department: user.department,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Input tidak valid.", errors: error.issues });
    }
    return res.status(500).json({
      message: "Gagal login.",
      ...(IS_PROD ? {} : { error: error.message }),
    });
  }
});

router.get("/me", authRequired, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
      createdAt: true,
    },
  });

  return res.json(user);
});

module.exports = router;
