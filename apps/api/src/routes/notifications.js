const express = require("express");

const prisma = require("../prisma");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

router.get("/", authRequired, async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      document: { select: { id: true, title: true, originalName: true } },
    },
  });

  return res.json(notifications);
});

router.patch("/:id/read", authRequired, async (req, res) => {
  const id = Number(req.params.id);
  const notification = await prisma.notification.findFirst({
    where: { id, userId: req.user.id },
  });

  if (!notification) {
    return res.status(404).json({ message: "Notifikasi tidak ditemukan." });
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });

  return res.json(updated);
});

router.patch("/read-all", authRequired, async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, isRead: false },
    data: { isRead: true },
  });

  return res.json({ message: "Semua notifikasi ditandai sudah dibaca." });
});

module.exports = router;
