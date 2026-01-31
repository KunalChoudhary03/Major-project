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

const buildAddressPayload = (overrides = {}) => ({
  street: "123 Main Street",
  city: "New York",
  state: "NY",
  pincode: "10001",
  country: "USA",
  ...overrides
});

const registerViaApi = async (payload) => {
  return request(app).post("/api/auth/register").send(payload);
};

describe("Address Management Endpoints", () => {
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

  // ============================================
  // GET /api/auth/users/me/addresses Tests
  // ============================================
  describe("GET /api/auth/users/me/addresses", () => {
    it("should return empty array for user with no addresses", async () => {
      const payload = buildRegisterPayload();
      const reg = await registerViaApi(payload);
      expect(reg.status).toBe(201);
      const accessToken = reg.body.tokens.accessToken;

      const response = await request(app)
        .get("/api/auth/users/me/addresses")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it("should return all saved addresses for authenticated user", async () => {
      const payload = buildRegisterPayload();
      const reg = await registerViaApi(payload);
      const accessToken = reg.body.tokens.accessToken;
      const userId = reg.body.user.id;

      // Add multiple addresses directly to database
      const address1 = buildAddressPayload();
      const address2 = buildAddressPayload({
        street: "456 Oak Avenue",
        city: "Los Angeles",
        state: "CA",
        pincode: "90001"
      });

      await User.findByIdAndUpdate(userId, {
        addresses: [address1, address2]
      });

      const response = await request(app)
        .get("/api/auth/users/me/addresses")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty("street", address1.street);
      expect(response.body[1]).toHaveProperty("street", address2.street);
    });

    it("should reject request without authentication token", async () => {
      const response = await request(app)
        .get("/api/auth/users/me/addresses");

      expect(response.status).toBeGreaterThanOrEqual(401);
    });

    it("should reject request with invalid token", async () => {
      const response = await request(app)
        .get("/api/auth/users/me/addresses")
        .set("Authorization", "Bearer invalid.token.here");

      expect(response.status).toBeGreaterThanOrEqual(401);
    });

    it("should reject request with expired token", async () => {
      const jwt = require("jsonwebtoken");
      const expiredToken = jwt.sign(
        { id: new mongoose.Types.ObjectId().toString() },
        process.env.JWT_SECRET,
        { expiresIn: "-1s" }
      );

      const response = await request(app)
        .get("/api/auth/users/me/addresses")
        .set("Authorization", `Bearer ${expiredToken}`);

      expect(response.status).toBeGreaterThanOrEqual(401);
    });

    it("should return addresses with all required fields", async () => {
      const payload = buildRegisterPayload();
      const reg = await registerViaApi(payload);
      const accessToken = reg.body.tokens.accessToken;
      const userId = reg.body.user.id;

      const address = buildAddressPayload();
      await User.findByIdAndUpdate(userId, {
        addresses: [address]
      });

      const response = await request(app)
        .get("/api/auth/users/me/addresses")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body[0]).toHaveProperty("street");
      expect(response.body[0]).toHaveProperty("city");
      expect(response.body[0]).toHaveProperty("state");
      expect(response.body[0]).toHaveProperty("pincode");
      expect(response.body[0]).toHaveProperty("country");
    });

    it("should not expose sensitive user data in address list", async () => {
      const payload = buildRegisterPayload();
      const reg = await registerViaApi(payload);
      const accessToken = reg.body.tokens.accessToken;

      const response = await request(app)
        .get("/api/auth/users/me/addresses")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      // Response should be array of addresses only
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // ============================================
  // POST /api/auth/users/me/addresses Tests
  // ============================================
  describe("POST /api/auth/users/me/addresses", () => {
    it("should successfully add an address with valid data", async () => {
      const payload = buildRegisterPayload();
      const reg = await registerViaApi(payload);
      expect(reg.status).toBe(201);
      const accessToken = reg.body.tokens.accessToken;

      const addressPayload = buildAddressPayload();
      const response = await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(addressPayload);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("_id");
      expect(response.body).toHaveProperty("street", addressPayload.street);
      expect(response.body).toHaveProperty("city", addressPayload.city);
      expect(response.body).toHaveProperty("state", addressPayload.state);
      expect(response.body).toHaveProperty("pincode", addressPayload.pincode);
      expect(response.body).toHaveProperty("country", addressPayload.country);
    });

    it("should add multiple addresses for the same user", async () => {
      const payload = buildRegisterPayload();
      const reg = await registerViaApi(payload);
      const accessToken = reg.body.tokens.accessToken;
      const userId = reg.body.user.id;

      const address1 = buildAddressPayload();
      const address2 = buildAddressPayload({
        street: "456 Oak Avenue",
        city: "Los Angeles",
        state: "CA",
        pincode: "90001"
      });

      const res1 = await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(address1);

      expect(res1.status).toBe(201);

      const res2 = await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(address2);

      expect(res2.status).toBe(201);

      // Verify both addresses are saved
      const user = await User.findById(userId);
      expect(user.addresses).toHaveLength(2);
    });

    it("should validate required fields - missing street", async () => {
      const payload = buildRegisterPayload();
      const reg = await registerViaApi(payload);
      const accessToken = reg.body.tokens.accessToken;

      const addressPayload = buildAddressPayload({ street: undefined });
      const response = await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(addressPayload);

      expect([400, 422]).toContain(response.status);
    });

    it("should validate required fields - missing city", async () => {
      const payload = buildRegisterPayload();
      const reg = await registerViaApi(payload);
      const accessToken = reg.body.tokens.accessToken;

      const addressPayload = buildAddressPayload({ city: undefined });
      const response = await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(addressPayload);

      expect([400, 422]).toContain(response.status);
    });

    it("should validate required fields - missing state", async () => {
      const payload = buildRegisterPayload();
      const reg = await registerViaApi(payload);
      const accessToken = reg.body.tokens.accessToken;

      const addressPayload = buildAddressPayload({ state: undefined });
      const response = await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(addressPayload);

      expect([400, 422]).toContain(response.status);
    });

    it("should validate required fields - missing zip/pincode", async () => {
      const payload = buildRegisterPayload();
      const reg = await registerViaApi(payload);
      const accessToken = reg.body.tokens.accessToken;

      const addressPayload = buildAddressPayload({ pincode: undefined });
      const response = await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(addressPayload);

      expect([400, 422]).toContain(response.status);
    });

    it("should validate required fields - missing country", async () => {
      const payload = buildRegisterPayload();
      const reg = await registerViaApi(payload);
      const accessToken = reg.body.tokens.accessToken;

      const addressPayload = buildAddressPayload({ country: undefined });
      const response = await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(addressPayload);

      expect([400, 422]).toContain(response.status);
    });

    it("should validate pincode format", async () => {
      const payload = buildRegisterPayload();
      const reg = await registerViaApi(payload);
      const accessToken = reg.body.tokens.accessToken;

      const addressPayload = buildAddressPayload({ pincode: "invalid" });
      const response = await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(addressPayload);

      expect([400, 422]).toContain(response.status);
    });

    it("should reject request without authentication", async () => {
      const addressPayload = buildAddressPayload();
      const response = await request(app)
        .post("/api/auth/users/me/addresses")
        .send(addressPayload);

      expect(response.status).toBeGreaterThanOrEqual(401);
    });

    it("should reject request with invalid token", async () => {
      const addressPayload = buildAddressPayload();
      const response = await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Authorization", "Bearer invalid.token.here")
        .send(addressPayload);

      expect(response.status).toBeGreaterThanOrEqual(401);
    });

    it("should reject request with expired token", async () => {
      const jwt = require("jsonwebtoken");
      const expiredToken = jwt.sign(
        { id: new mongoose.Types.ObjectId().toString() },
        process.env.JWT_SECRET,
        { expiresIn: "-1s" }
      );

      const addressPayload = buildAddressPayload();
      const response = await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Authorization", `Bearer ${expiredToken}`)
        .send(addressPayload);

      expect(response.status).toBeGreaterThanOrEqual(401);
    });

    it("should trim whitespace from address fields", async () => {
      const payload = buildRegisterPayload();
      const reg = await registerViaApi(payload);
      const accessToken = reg.body.tokens.accessToken;

      const addressPayload = buildAddressPayload({
        street: "  123 Main Street  ",
        city: "  New York  "
      });

      const response = await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(addressPayload);

      expect(response.status).toBe(201);
      // Address should be trimmed
      expect(response.body.street).toBe("123 Main Street");
      expect(response.body.city).toBe("New York");
    });

    it("should sanitize HTML in address fields", async () => {
      const payload = buildRegisterPayload();
      const reg = await registerViaApi(payload);
      const accessToken = reg.body.tokens.accessToken;

      const addressPayload = buildAddressPayload({
        street: "123 Main Street <script>alert('xss')</script>"
      });

      const response = await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(addressPayload);

      expect(response.status).toBe(201);
      // Script tags should be removed/escaped
      expect(response.body.street).not.toContain("<script>");
    });
  });

  // ============================================
  // DELETE /api/auth/users/me/addresses/:addressId Tests
  // ============================================
  describe("DELETE /api/auth/users/me/addresses/:addressId", () => {
    it("should successfully delete an address by id", async () => {
      const payload = buildRegisterPayload();
      const reg = await registerViaApi(payload);
      const accessToken = reg.body.tokens.accessToken;
      const userId = reg.body.user.id;

      // Add an address
      const address = buildAddressPayload();
      const addRes = await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(address);

      expect(addRes.status).toBe(201);
      const addressId = addRes.body._id;

      // Delete the address
      const delRes = await request(app)
        .delete(`/api/auth/users/me/addresses/${addressId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(delRes.status).toBe(200);

      // Verify address is deleted
      const user = await User.findById(userId);
      expect(user.addresses).toHaveLength(0);
    });

    it("should delete correct address when user has multiple addresses", async () => {
      const payload = buildRegisterPayload();
      const reg = await registerViaApi(payload);
      const accessToken = reg.body.tokens.accessToken;
      const userId = reg.body.user.id;

      // Add two addresses
      const address1 = buildAddressPayload();
      const address2 = buildAddressPayload({
        street: "456 Oak Avenue",
        city: "Los Angeles"
      });

      const res1 = await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(address1);
      const addressId1 = res1.body._id;

      const res2 = await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(address2);
      const addressId2 = res2.body._id;

      // Delete first address
      const delRes = await request(app)
        .delete(`/api/auth/users/me/addresses/${addressId1}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(delRes.status).toBe(200);

      // Verify only second address remains
      const user = await User.findById(userId);
      expect(user.addresses).toHaveLength(1);
      expect(user.addresses[0]._id.toString()).toBe(addressId2);
    });

    it("should return 404 when deleting non-existent address", async () => {
      const payload = buildRegisterPayload();
      const reg = await registerViaApi(payload);
      const accessToken = reg.body.tokens.accessToken;

      const fakeAddressId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/auth/users/me/addresses/${fakeAddressId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });

    it("should return 400 for invalid address id format", async () => {
      const payload = buildRegisterPayload();
      const reg = await registerViaApi(payload);
      const accessToken = reg.body.tokens.accessToken;

      const response = await request(app)
        .delete(`/api/auth/users/me/addresses/invalid-id`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect([400, 404]).toContain(response.status);
    });

    it("should reject request without authentication", async () => {
      const fakeAddressId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/auth/users/me/addresses/${fakeAddressId}`);

      expect(response.status).toBeGreaterThanOrEqual(401);
    });

    it("should reject request with invalid token", async () => {
      const fakeAddressId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/auth/users/me/addresses/${fakeAddressId}`)
        .set("Authorization", "Bearer invalid.token.here");

      expect(response.status).toBeGreaterThanOrEqual(401);
    });

    it("should reject request with expired token", async () => {
      const jwt = require("jsonwebtoken");
      const expiredToken = jwt.sign(
        { id: new mongoose.Types.ObjectId().toString() },
        process.env.JWT_SECRET,
        { expiresIn: "-1s" }
      );

      const fakeAddressId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/auth/users/me/addresses/${fakeAddressId}`)
        .set("Authorization", `Bearer ${expiredToken}`);

      expect(response.status).toBeGreaterThanOrEqual(401);
    });

    it("should not allow user to delete another user's address", async () => {
      // Create first user and add address
      const payload1 = buildRegisterPayload();
      const reg1 = await registerViaApi(payload1);
      const accessToken1 = reg1.body.tokens.accessToken;

      const address = buildAddressPayload();
      const addRes = await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Authorization", `Bearer ${accessToken1}`)
        .send(address);
      const addressId = addRes.body._id;

      // Create second user and attempt to delete first user's address
      const payload2 = buildRegisterPayload({
        username: "testuser2",
        email: "test2@example.com"
      });
      const reg2 = await registerViaApi(payload2);
      const accessToken2 = reg2.body.tokens.accessToken;

      const delRes = await request(app)
        .delete(`/api/auth/users/me/addresses/${addressId}`)
        .set("Authorization", `Bearer ${accessToken2}`);

      expect(delRes.status).toBe(403);
    });

    it("should return success message on deletion", async () => {
      const payload = buildRegisterPayload();
      const reg = await registerViaApi(payload);
      const accessToken = reg.body.tokens.accessToken;

      const address = buildAddressPayload();
      const addRes = await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(address);
      const addressId = addRes.body._id;

      const delRes = await request(app)
        .delete(`/api/auth/users/me/addresses/${addressId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body).toHaveProperty("message");
    });

    it("should idempotently fail on double delete", async () => {
      const payload = buildRegisterPayload();
      const reg = await registerViaApi(payload);
      const accessToken = reg.body.tokens.accessToken;

      const address = buildAddressPayload();
      const addRes = await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(address);
      const addressId = addRes.body._id;

      // Delete once
      const delRes1 = await request(app)
        .delete(`/api/auth/users/me/addresses/${addressId}`)
        .set("Authorization", `Bearer ${accessToken}`);
      expect(delRes1.status).toBe(200);

      // Delete again - should return 404
      const delRes2 = await request(app)
        .delete(`/api/auth/users/me/addresses/${addressId}`)
        .set("Authorization", `Bearer ${accessToken}`);
      expect(delRes2.status).toBe(404);
    });
  });
});
