const express = require("express");

const prisma = require("../prisma");
const { authRequired, requireRoles } = require("../middleware/auth");
const { getUserScope, isAdmin, buildDocumentAccessWhere } = require("../utils/access");

const router = express.Router();

router.get("/", authRequired, requireRoles("ADMIN", "MANAGER"), async (req, res) => {
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 20);

  const userScope = await getUserScope(req.user.id);

  if (!userScope) {
    return res.status(401).json({ message: "User tidak ditemukan." });
  }

  const documentWhere = buildDocumentAccessWhere({ user: req.user, userScope });
  const where = isAdmin(userScope)
    ? {}
    : {
        OR: [
          { userId: req.user.id },
          { document: documentWhere },
        ],
      };

  const [items, total] = await Promise.all([
    prisma.log.findMany({
      where,
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
    prisma.log.count({ where }),
  ]);

  return res.json({
    page,
    pageSize,
    total,
    items,
  });
});

module.exports = router;
