const express = require("express");

const prisma = require("../prisma");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

router.get("/summary", authRequired, async (_req, res) => {
  const [totalDocuments, recentDocuments, uploadStats, totalUsers] = await Promise.all([
    prisma.document.count(),
    prisma.document.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        category: true,
        uploadedBy: { select: { id: true, name: true, role: true } },
      },
    }),
    prisma.document.groupBy({
      by: ["categoryId"],
      _count: { _all: true },
    }),
    prisma.user.count(),
  ]);

  return res.json({
    totalDocuments,
    totalUsers,
    recentDocuments,
    uploadStats,
  });
});

module.exports = router;
