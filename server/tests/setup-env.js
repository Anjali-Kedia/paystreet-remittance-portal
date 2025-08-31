// point Prisma to test DB if provided
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
process.env.NODE_ENV = "test";
