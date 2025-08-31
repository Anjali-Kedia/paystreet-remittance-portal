// server/tests/beneficiaries.test.js
import request from "supertest";
import { createApp, prisma } from "../src/app.js";

const app = createApp();

async function login() {
  const email = `b_${Date.now()}@t.com`;
  await request(app)
    .post("/api/auth/signup")
    .send({ fullName: "B User", email, password: "password123" });
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "password123" });
  return res.body.token;
}

describe("Beneficiaries", () => {
  let token;

  beforeAll(async () => {
    await prisma.transaction.deleteMany();
    await prisma.beneficiary.deleteMany();
    await prisma.user.deleteMany();
    token = await login();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates, lists, updates, and deletes a beneficiary", async () => {
    // create
    const create = await request(app)
      .post("/api/beneficiaries")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Jane Doe",
        bankAccount: "1234-5678",
        country: "IN",
        currency: "INR",
      })
      .expect(201);

    const id = create.body.id;

    // list
    const list = await request(app)
      .get("/api/beneficiaries")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(list.body.find((b) => b.id === id)).toBeTruthy();

    // update
    await request(app)
      .put(`/api/beneficiaries/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Jane Updated",
        bankAccount: "1234-5678",
        country: "IN",
        currency: "INR",
      })
      .expect(200);

    // delete
    await request(app)
      .delete(`/api/beneficiaries/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);
  });
});
