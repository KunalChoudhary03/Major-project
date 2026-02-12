const request = require("supertest");
const app = require("../src/app");
const { getAuthCookie } = require("../src/utils/auth");
const axios = require("axios");

// Mock axios to prevent real HTTP calls to cart/product services
jest.mock("axios");

describe("POST /api/orders", () => {
  let authCookie;

  beforeAll(() => {
    process.env.JWT_SECRET = "test-secret";
    process.env.JWT_COOKIE_NAME = "token";
    authCookie = getAuthCookie({ extra: { role: "user" } });
  });

  beforeEach(() => {
    // Mock cart service response
    axios.get.mockImplementation((url) => {
      if (url.includes("/cart") || url.includes("/api/cart")) {
        return Promise.resolve({
          data: {
            cart: {
              items: [
                {
                  productId: "507f1f77bcf86cd799439011",
                  quantity: 2,
                },
              ],
            },
          },
        });
      }
      
      // Mock product service response
      if (url.includes("/products/") || url.includes("/api/products/")) {
        return Promise.resolve({
          data: {
            product: {
              _id: "507f1f77bcf86cd799439011",
              title: "Test Product",
              price: {
                amount: 100,
                currency: "INR",
              },
              stock: 10,
            },
          },
        });
      }

      return Promise.reject({ response: { status: 404 } });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
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
        order: expect.objectContaining({
          status: "PENDING",
          items: expect.any(Array),
          totalPrice: expect.objectContaining({
            amount: expect.any(Number),
            currency: expect.any(String),
          }),
        }),
      })
    );

    if (Array.isArray(res.body.order?.items) && res.body.order.items.length > 0) {
      expect(res.body.order.items[0]).toEqual(
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
    // Mock empty cart response
    axios.get.mockImplementation((url) => {
      if (url.includes("/cart") || url.includes("/api/cart")) {
        return Promise.resolve({
          data: {
            cart: {
              items: [],
            },
          },
        });
      }
      return Promise.reject({ response: { status: 404 } });
    });

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
    // Mock cart with items but product has insufficient stock
    axios.get.mockImplementation((url) => {
      if (url.includes("/cart") || url.includes("/api/cart")) {
        return Promise.resolve({
          data: {
            cart: {
              items: [
                {
                  productId: "507f1f77bcf86cd799439011",
                  quantity: 20, // Request more than available
                },
              ],
            },
          },
        });
      }

      // Mock product with low stock
      if (url.includes("/products/") || url.includes("/api/products/")) {
        return Promise.resolve({
          data: {
            product: {
              _id: "507f1f77bcf86cd799439011",
              title: "Limited Stock Product",
              price: {
                amount: 100,
                currency: "INR",
              },
              stock: 5, // Only 5 in stock
            },
          },
        });
      }

      return Promise.reject({ response: { status: 404 } });
    });

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
