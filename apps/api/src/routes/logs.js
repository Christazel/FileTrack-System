const express = require("express");
const { z } = require("zod");

const prisma = require("../prisma");
const { authRequired, requireRoles } = require("../middleware/auth");
const { getUserScope, isAdmin, buildDocumentAccessWhere } = require("../utils/access");

const router = express.Router();

router.get("/", authRequired, requireRoles("ADMIN", "MANAGER"), async (req, res) => {
  const querySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
  });

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: "Query tidak valid.", errors: parsed.error.issues });
  }

  const { page, pageSize } = parsed.data;

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
          { document: { is: documentWhere } },
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
