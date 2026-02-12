const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const orderModel = require("../src/models/order.model");
const { getAuthCookie } = require("../src/utils/auth");
describe("Orders read/update endpoints", () => { let authCookie; let userId; const buildOrderPayload = ({ status = "PENDING", user = null } = {}) => ({ user: user || userId, items: [
      {
        product: new mongoose.Types.ObjectId(),
        quantity: 2,
        price: {
          amount: 200,
          currency: "INR",
        },
      },
    ],
    status,
    totalPrice: {
      amount: 200,
      currency: "INR",
    },
    shippingAddress: {
      street: "221B Baker Street",
      city: "London",
      state: "London",
      pincode: "NW16XE",
      country: "UK",
    },
  });

  beforeAll(() => {
    process.env.JWT_SECRET = "test-secret";
    process.env.JWT_COOKIE_NAME = "token";
    userId = new mongoose.Types.ObjectId().toString();
    authCookie = getAuthCookie({ userId, extra: { role: "user" } });
  });

  describe("GET /api/orders/:id", () => {
    test("returns order by id with timeline and payment summary", async () => {
      const order = await orderModel.create(buildOrderPayload());
    if (!order) {
        return;
    }
      const res = await request(app)
        .get(`/api/orders/${order._id}`)
        .set("Cookie", authCookie);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          order: expect.objectContaining({
            _id: order._id.toString(),
            items: expect.any(Array),
            status: expect.any(String),
            totalPrice: expect.any(Object),
            shippingAddress: expect.any(Object),
            timeline: expect.any(Array),
            paymentSummary: expect.any(Object),
          }),
        })
      );
    });

    test("returns 404 when order does not exist", async () => {
      const missingId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/orders/${missingId}`)
        .set("Cookie", authCookie);

      expect(res.status).toBe(404);
      expect(res.body).toEqual(
        expect.objectContaining({
          message: expect.any(String),
        })
      );
    });

    test("returns 401 when unauthenticated", async () => {
      const order = await orderModel.create(buildOrderPayload());

      const res = await request(app).get(`/api/orders/${order._id}`);

      expect(res.status).toBe(401);
      expect(res.body).toEqual(
        expect.objectContaining({
          message: expect.any(String),
        })
      );
    });
  });

  describe("GET /api/orders/me", () => {
    test("returns paginated orders for current user", async () => {
      const otherUserId = new mongoose.Types.ObjectId().toString();
      await orderModel.create(buildOrderPayload({ user: otherUserId }));
      await orderModel.create(buildOrderPayload());
      await orderModel.create(buildOrderPayload());
      await orderModel.create(buildOrderPayload());

      const res = await request(app)
        .get("/api/orders/me?page=1&limit=2")
        .set("Cookie", authCookie);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          orders: expect.any(Array),
        })
      );
      res.body.orders.forEach((order) => {
        expect(order.user?.toString?.() || order.user).toBe(userId);
      });
      expect(res.body.orders.length).toBeLessThanOrEqual(2);
    });

    test("returns 401 when unauthenticated", async () => {
      const res = await request(app).get("/api/orders/me");

      expect(res.status).toBe(401);
      expect(res.body).toEqual(
        expect.objectContaining({
          message: expect.any(String),
        })
      );
    });
  });

  describe("POST /api/orders/:id/cancel", () => {
    test("allows buyer to cancel pending order", async () => {
      const order = await orderModel.create(buildOrderPayload({ status: "PENDING" }));

      const res = await request(app)
        .post(`/api/orders/${order._id}/cancel`)
        .set("Cookie", authCookie);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          order: expect.objectContaining({
            _id: order._id.toString(),
            status: "CANCELLED",
          }),
        })
      );
    });

    test("rejects cancellation when order is not pending/paid", async () => {
      const order = await orderModel.create(buildOrderPayload({ status: "SHIPPED" }));

      const res = await request(app)
        .post(`/api/orders/${order._id}/cancel`)
        .set("Cookie", authCookie);

      expect(res.status).toBe(409);
      expect(res.body).toEqual(
        expect.objectContaining({
          message: expect.any(String),
        })
      );
    });
  });

  describe("PATCH /api/orders/:id/address", () => {
    test("updates delivery address prior to payment capture", async () => {
      const order = await orderModel.create(buildOrderPayload({ status: "PENDING" }));

      const payload = {
        shippingAddress: {
          street: "10 Downing St",
          city: "London",
          state: "London",
          pincode: "SW1A2AA",
          country: "UK",
        },
      };

      const res = await request(app)
        .patch(`/api/orders/${order._id}/address`)
        .set("Cookie", authCookie)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          order: expect.objectContaining({
            _id: order._id.toString(),
            shippingAddress: expect.objectContaining(payload.shippingAddress),
          }),
        })
      );
    });

    test("rejects address update when order already paid/captured", async () => {
      const order = await orderModel.create(buildOrderPayload({ status: "SHIPPED" }));

      const payload = {
        shippingAddress: {
          street: "1600 Amphitheatre Pkwy",
          city: "Mountain View",
          state: "CA",
          pincode: "94043",
          country: "US",
        },
      };

      const res = await request(app)
        .patch(`/api/orders/${order._id}/address`)
        .set("Cookie", authCookie)
        .send(payload);

      expect(res.status).toBe(409);
      expect(res.body).toEqual(
        expect.objectContaining({
          message: expect.any(String),
        })
      );
    });
  });
});
