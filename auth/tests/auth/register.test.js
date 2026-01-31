const request = require("supertest");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../../src/app");
const connectDB = require("../../src/db/db");
const User = require("../../src/models/user.model");

let mongoServer;

const buildRegisterPayload = (overrides = {}) => ({
  username: "testuser",
  email: "test@example.com",
  password: "Password123!",
  role: "user",
  fullName: {
    firstName: "Test",
    lastName: "User"
  },
  ...overrides
});

describe("POST /api/auth/register", () => {
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

  it("creates a new user and returns tokens", async () => {
    const payload = buildRegisterPayload();

    const response = await request(app).post("/api/auth/register").send(payload);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("tokens.accessToken");
    expect(response.body).toHaveProperty("tokens.refreshToken");

    const createdUser = await User.findOne({ email: payload.email });
    expect(createdUser).not.toBeNull();

    const passwordMatches = await bcrypt.compare(payload.password, createdUser.password);
    expect(passwordMatches).toBe(true);
  });

  it("rejects duplicate email registrations", async () => {
    const payload = buildRegisterPayload();

    await request(app).post("/api/auth/register").send(payload);
    const duplicate = await request(app).post("/api/auth/register").send(payload);

    expect([400, 409]).toContain(duplicate.status);

    const users = await User.find({ email: payload.email });
    expect(users).toHaveLength(1);
  });

  it("validates required fields", async () => {
    const payload = buildRegisterPayload({ email: undefined });

    const response = await request(app)
      .post("/api/auth/register")
      .send(payload)
      .set("Content-Type", "application/json");

    expect([400, 422]).toContain(response.status);

    const users = await User.find({});
    expect(users).toHaveLength(0);
  });
});
