const express = require("express");

const prisma = require("../prisma");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

router.get("/", authRequired, async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true },
  });

  return res.json(users);
});

module.exports = router;
