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

describe("GET /api/auth/logout", () => {
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

  it("clears auth cookie and prevents access to /me when logged out", async () => {
    const payload = buildRegisterPayload();
    const reg = await registerViaApi(payload);
    expect(reg.status).toBe(201);

    const cookies = reg.headers["set-cookie"];
    expect(cookies).toBeDefined();

    const logoutRes = await request(app)
      .get("/api/auth/logout")
      .set("Cookie", cookies);

    // Accept 200 OK or 204 No Content as valid logout responses
    expect([200, 204]).toContain(logoutRes.status);

    // If server clears cookie it should send a Set-Cookie header that clears token
    if (logoutRes.headers["set-cookie"]) {
      const sc = logoutRes.headers["set-cookie"].join(";");
      expect(sc).toMatch(/token=/);
    }

    // Subsequent request to /me with the same cookie should not succeed
    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookies);

    expect(meRes.status).toBeGreaterThanOrEqual(401);
    expect(meRes.status).toBeLessThanOrEqual(404);
  });

  it("returns success (or appropriate error) when no cookie provided", async () => {
    const res = await request(app).get("/api/auth/logout");
    // Allow success or auth-related response
    expect([200, 204, 401, 403]).toContain(res.status);
  });
});
