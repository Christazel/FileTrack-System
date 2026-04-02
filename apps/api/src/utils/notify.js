const prisma = require("../prisma");

async function createNotification({ userId, documentId = null, action, title, detail }) {
  await prisma.notification.create({
    data: {
      userId,
      documentId,
      action,
      title,
      detail,
    },
  });
}

async function notifyRoles({ roles, documentId = null, action, title, detail, excludeUserId = null }) {
  const users = await prisma.user.findMany({
    where: {
      role: { in: roles },
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  });

  if (!users.length) {
    return;
  }

  await prisma.notification.createMany({
    data: users.map((user) => ({
      userId: user.id,
      documentId,
      action,
      title,
      detail,
    })),
  });
}

module.exports = {
  createNotification,
  notifyRoles,
};
