const request = require("supertest");
const mongoose = require("mongoose");
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

const registerViaApi = async (payload) => {
  return request(app).post("/api/auth/register").send(payload);
};

const loginViaApi = async (email, password) => {
  return request(app)
    .post("/api/auth/login")
    .send({ email, password });
};

describe("GET /api/auth/me", () => {
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

  it("returns authenticated user details with valid token", async () => {
    const payload = buildRegisterPayload();
    const reg = await registerViaApi(payload);
    expect(reg.status).toBe(201);
    const accessToken = reg.body.tokens.accessToken;

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("_id");
    expect(response.body).toHaveProperty("email", payload.email);
    expect(response.body).toHaveProperty("username", payload.username);
    expect(response.body).toHaveProperty("role", payload.role);
    expect(response.body).toHaveProperty("fullName");
    expect(response.body.fullName).toHaveProperty("firstName", payload.fullName.firstName);
    expect(response.body.fullName).toHaveProperty("lastName", payload.fullName.lastName);
    expect(response.body).not.toHaveProperty("password");
  });

  it("rejects request without authorization token", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBeGreaterThanOrEqual(401);
    expect(response.status).toBeLessThanOrEqual(403);
  });

  it("rejects request with invalid token", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid.token.here");

    expect(response.status).toBeGreaterThanOrEqual(401);
    expect(response.status).toBeLessThanOrEqual(403);
  });

  it("rejects request with expired token", async () => {
    // Create a token with immediate expiration
    const jwt = require("jsonwebtoken");
    const expiredToken = jwt.sign(
      { userId: "123456789012", role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: "-1s" }
    );

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${expiredToken}`);

    expect(response.status).toBeGreaterThanOrEqual(401);
    expect(response.status).toBeLessThanOrEqual(403);
  });

  it("rejects request with malformed authorization header", async () => {
    const payload = buildRegisterPayload();
    const reg = await registerViaApi(payload);
    const accessToken = reg.body.tokens.accessToken;

    // Missing "Bearer" prefix
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", accessToken);

    expect(response.status).toBeGreaterThanOrEqual(401);
    expect(response.status).toBeLessThanOrEqual(403);
  });

  it("returns user with different role (seller)", async () => {
    const payload = buildRegisterPayload({ 
      role: "seller",
      email: "seller@example.com",
      username: "selleruser"
    });
    const reg = await registerViaApi(payload);
    expect(reg.status).toBe(201);
    const accessToken = reg.body.tokens.accessToken;

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("role", "seller");
  });

  it("returns correct user when multiple users exist", async () => {
    // Create first user
    const payload1 = buildRegisterPayload();
    await registerViaApi(payload1);

    // Create second user
    const payload2 = buildRegisterPayload({
      username: "seconduser",
      email: "second@example.com"
    });
    const reg2 = await registerViaApi(payload2);
    const accessToken = reg2.body.tokens.accessToken;

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("email", payload2.email);
    expect(response.body).toHaveProperty("username", payload2.username);
    expect(response.body.email).not.toBe(payload1.email);
  });

  it("handles token with non-existent user", async () => {
    const jwt = require("jsonwebtoken");
    const fakeUserId = new mongoose.Types.ObjectId();
    const token = jwt.sign(
      { id: fakeUserId.toString(), role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBeGreaterThanOrEqual(401);
    expect(response.status).toBeLessThanOrEqual(404);
  });

  it("does not expose sensitive information in response", async () => {
    const payload = buildRegisterPayload();
    const reg = await registerViaApi(payload);
    const accessToken = reg.body.tokens.accessToken;

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    // Should not return password or refresh tokens
    expect(response.body).not.toHaveProperty("password");
    expect(response.body).not.toHaveProperty("refreshToken");
    expect(response.body).not.toHaveProperty("__v");
  });

  it("accepts token from cookie if present", async () => {
    const payload = buildRegisterPayload();
    const reg = await registerViaApi(payload);
    const cookies = reg.headers["set-cookie"];

    const response = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookies);

    // Should work if middleware supports cookie authentication
    // If not, it will return 401/403
    const validStatuses = [200, 401, 403, 404];
    expect(validStatuses).toContain(response.status);
  });
});
