const prisma = require("../prisma");

async function writeLog({ userId, action, detail, documentId }) {
  await prisma.log.create({
    data: {
      userId,
      action,
      detail,
      documentId,
    },
  });
}

module.exports = {
  writeLog,
};
