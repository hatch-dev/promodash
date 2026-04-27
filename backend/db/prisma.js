// db/prisma.js
// Single shared PrismaClient instance for the whole server.
// Import this everywhere instead of `new PrismaClient()`.

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

// Graceful shutdown
process.on("SIGINT",  () => prisma.$disconnect().then(() => process.exit(0)));
process.on("SIGTERM", () => prisma.$disconnect().then(() => process.exit(0)));

module.exports = prisma;
