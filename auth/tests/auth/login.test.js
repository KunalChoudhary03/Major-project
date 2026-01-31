const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../../src/app");
const connectDB = require("../../src/db/db");
const User = require("../../src/models/user.model");

let mongoServer;

const buildRegisterPayload = (overrides = {}) => ({
  username: "loginuser",
  email: "login@example.com",
  password: "Password123!",
  role: "user",
  fullName: {
    firstName: "Login",
    lastName: "User"
  },
  ...overrides
});

const registerViaApi = async (payload) => {
  return request(app).post("/api/auth/register").send(payload);
};

describe("POST /api/auth/login", () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongoServer.getUri();
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
    process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "test-refresh-secret";
    await connectDB();
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it("logs in with valid credentials and returns tokens", async () => {
    const payload = buildRegisterPayload();
    const reg = await registerViaApi(payload);
    expect(reg.status).toBe(201);

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: payload.email, password: payload.password });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message", "Login successful");
    expect(response.body).toHaveProperty("user");
    expect(response.body.user).toHaveProperty("email", payload.email);

    const setCookie = response.headers["set-cookie"] || [];
    const hasTokenCookie = setCookie.some((c) => c.toLowerCase().startsWith("token="));
    expect(hasTokenCookie).toBe(true);
  });

  it("rejects login with wrong password", async () => {
    const payload = buildRegisterPayload();
    const reg = await registerViaApi(payload);
    expect(reg.status).toBe(201);

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: payload.email, password: "WrongPassword!" });

    expect([400, 401]).toContain(response.status);
    expect(response.body).not.toHaveProperty("user");
    const setCookie = response.headers["set-cookie"] || [];
    const hasTokenCookie = setCookie.some((c) => c.toLowerCase().startsWith("token="));
    expect(hasTokenCookie).toBe(false);
  });

  it("validates required fields", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({});

    expect([400, 422]).toContain(response.status);
  });
});
