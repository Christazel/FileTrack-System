const express = require("express");

const prisma = require("../prisma");
const { authRequired, requireRoles } = require("../middleware/auth");

const router = express.Router();

router.get("/", authRequired, requireRoles("ADMIN", "MANAGER"), async (req, res) => {
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 20);

  const [items, total] = await Promise.all([
    prisma.log.findMany({
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
        document: {
          select: { id: true, title: true, originalName: true },
        },
      },
    }),
    prisma.log.count(),
  ]);

  return res.json({
    page,
    pageSize,
    total,
    items,
  });
});

module.exports = router;
