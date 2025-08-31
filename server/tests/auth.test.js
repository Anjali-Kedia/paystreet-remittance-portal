// server/tests/auth.test.js
import request from "supertest";
import { createApp, prisma } from "../src/app.js";

const app = createApp();

describe("Auth", () => {
  beforeAll(async () => {
    await prisma.transaction.deleteMany();
    await prisma.beneficiary.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("signs up a new user", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({
        fullName: "Alice Test",
        email: "alice@test.com",
        password: "password123",
      })
      .expect(201);

    expect(res.body.user.email).toBe("alice@test.com");
    expect(res.body.user.accountNumber).toBeTruthy();
    expect(res.body.token).toBeTruthy();
  });

  it("rejects duplicate email", async () => {
    await request(app)
      .post("/api/auth/signup")
      .send({ fullName: "Dup", email: "dup@test.com", password: "password123" })
      .expect(201);

    const dup = await request(app)
      .post("/api/auth/signup")
      .send({
        fullName: "Dup2",
        email: "dup@test.com",
        password: "password123",
      })
      .expect(409);

    expect(dup.body.error).toMatch(/Email already in use/i);
  });

  it("logs in with valid credentials", async () => {
    await request(app).post("/api/auth/signup").send({
      fullName: "Bob",
      email: "bob@test.com",
      password: "password123",
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "bob@test.com", password: "password123" })
      .expect(200);

    expect(res.body.user.email).toBe("bob@test.com");
    expect(res.body.token).toBeTruthy();
  });
});
