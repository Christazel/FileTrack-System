const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 10);

  const users = [
    { name: "Admin Utama", email: "admin@filetrack.local", role: "ADMIN" },
    { name: "Manager Arsip", email: "manager@filetrack.local", role: "MANAGER" },
    { name: "Staff Operasional", email: "staff@filetrack.local", role: "STAFF" },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, password: passwordHash },
      create: { ...user, password: passwordHash },
    });
  }

  for (const name of ["Kontrak", "Keuangan", "Legal", "Operasional", "HR"]) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log("Seed selesai. Gunakan password: Password123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
