const express = require("express");

const prisma = require("../prisma");
const { authRequired } = require("../middleware/auth");
const { getUserScope, isAdmin, isManager, buildDocumentAccessWhere } = require("../utils/access");

const router = express.Router();

router.get("/summary", authRequired, async (req, res) => {
  const userScope = await getUserScope(req.user.id);

  if (!userScope) {
    return res.status(401).json({ message: "User tidak ditemukan." });
  }

  const documentWhere = buildDocumentAccessWhere({ user: req.user, userScope });
  const userWhere = isAdmin(userScope)
    ? {}
    : isManager(userScope)
      ? { departmentId: userScope.departmentId || null }
      : { id: req.user.id };

  const [totalDocuments, recentDocuments, uploadStats, totalUsers] = await Promise.all([
    prisma.document.count({ where: documentWhere }),
    prisma.document.findMany({
      where: documentWhere,
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        category: true,
        uploadedBy: { select: { id: true, name: true, role: true } },
      },
    }),
    prisma.document.groupBy({
      by: ["categoryId"],
      where: documentWhere,
      _count: { _all: true },
    }),
    prisma.user.count({ where: userWhere }),
  ]);

  return res.json({
    totalDocuments,
    totalUsers,
    recentDocuments,
    uploadStats,
  });
});

module.exports = router;
