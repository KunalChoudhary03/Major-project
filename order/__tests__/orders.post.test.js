const request = require("supertest");
const app = require("../src/app");
const { getAuthCookie } = require("../src/utils/auth");

describe("POST /api/orders", () => {
  let authCookie;

  beforeAll(() => {
    process.env.JWT_SECRET = "test-secret";
    process.env.JWT_COOKIE_NAME = "token";
    authCookie = getAuthCookie({ extra: { role: "user" } });
  });

  test("creates an order from current cart with pending status", async () => {
    const payload = {
      shippingAddress: {
        street: "221B Baker Street",
        city: "London",
        state: "London",
        pincode: "NW16XE",
        country: "UK",
      },
    };

    const res = await request(app)
      .post("/api/orders")
      .set("Cookie", authCookie)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: "PENDING",
        items: expect.any(Array),
        totalPrice: expect.objectContaining({
          amount: expect.any(Number),
          currency: expect.any(String),
        }),
      })
    );

    if (Array.isArray(res.body.items) && res.body.items.length > 0) {
      expect(res.body.items[0]).toEqual(
        expect.objectContaining({
          product: expect.anything(),
          quantity: expect.any(Number),
          price: expect.objectContaining({
            amount: expect.any(Number),
            currency: expect.any(String),
          }),
        })
      );
    }
  });

  test("returns 400 when shipping address is missing", async () => {
    const res = await request(app)
      .post("/api/orders")
      .set("Cookie", authCookie)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: expect.any(String),
      })
    );
  });

  test("returns 400 when cart is empty", async () => {
    const payload = {
      shippingAddress: {
        street: "10 Downing St",
        city: "London",
        state: "London",
        pincode: "SW1A2AA",
        country: "UK",
      },
      cartId: "empty-cart",
    };

    const res = await request(app)
      .post("/api/orders")
      .set("Cookie", authCookie)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: expect.any(String),
      })
    );
  });

  test("returns 409 when inventory reservation fails", async () => {
    const payload = {
      shippingAddress: {
        street: "1600 Amphitheatre Pkwy",
        city: "Mountain View",
        state: "CA",
        pincode: "94043",
        country: "US",
      },
      cartId: "insufficient-stock-cart",
    };

    const res = await request(app)
      .post("/api/orders")
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
