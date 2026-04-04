const prisma = require("../prisma");

function isAdmin(user) {
  return user?.role === "ADMIN";
}

function isManager(user) {
  return user?.role === "MANAGER";
}

function isStaff(user) {
  return user?.role === "STAFF";
}

async function getUserScope(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, departmentId: true },
  });
  return user;
}

function buildDocumentAccessWhere({ user, userScope }) {
  if (!user || !userScope) {
    return { id: -1 };
  }

  if (isAdmin(userScope)) {
    return {};
  }

  if (isManager(userScope)) {
    return {
      OR: [
        ...(userScope.departmentId ? [{ departmentId: userScope.departmentId }] : []),
        { uploadedById: user.id },
      ],
    };
  }

  return {
    OR: [
      { assignedToId: user.id },
      { uploadedById: user.id },
      { shares: { some: { sharedToId: user.id } } },
    ],
  };
}

function canAccessDocument({ user, userScope, document }) {
  if (!user || !userScope || !document) {
    return false;
  }

  if (isAdmin(userScope)) {
    return true;
  }

  if (isManager(userScope)) {
    return (
      (userScope.departmentId && document.departmentId === userScope.departmentId) ||
      document.uploadedById === user.id
    );
  }

  const shareAccess = Array.isArray(document.shares)
    ? document.shares.some((share) => share.sharedToId === user.id)
    : false;

  return document.assignedToId === user.id || document.uploadedById === user.id || shareAccess;
}

async function findDocumentWithAccess({ documentId, user, userScope, include = {} }) {
  const accessWhere = buildDocumentAccessWhere({ user, userScope });
  const document = await prisma.document.findFirst({
    where: { id: documentId, ...accessWhere },
    include,
  });
  return document;
}

module.exports = {
  isAdmin,
  isManager,
  isStaff,
  getUserScope,
  buildDocumentAccessWhere,
  canAccessDocument,
  findDocumentWithAccess,
};
