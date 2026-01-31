# Test Examples and Usage Patterns

This file provides practical examples of testing patterns used in the Jest setup.

## Table of Contents

1. [Basic Test Structure](#basic-test-structure)
2. [Integration Tests with Supertest](#integration-tests-with-supertest)
3. [Unit Tests with Mocks](#unit-tests-with-mocks)
4. [File Upload Testing](#file-upload-testing)
5. [Error Handling Tests](#error-handling-tests)
6. [Common Assertions](#common-assertions)

---

## Basic Test Structure

### Test File Template

```javascript
// At the top: imports and mocks
const request = require("supertest");
const app = require("../app");
const Model = require("../models/model");
const ExternalService = require("external-service");

// Mock external dependencies
jest.mock("../models/model");
jest.mock("external-service");

// Main test suite
describe("API Endpoint or Feature", () => {
  let mockService;

  // Setup before each test
  beforeEach(() => {
    jest.clearAllMocks();
    mockService = ExternalService.mock.results[0].value;
  });

  // Test group
  describe("Successful Cases", () => {
    test("should do something", async () => {
      // Arrange: setup test data
      const data = {
        /* ... */
      };

      // Act: perform action
      const response = await request(app).post("/endpoint").send(data);

      // Assert: verify results
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe("Error Cases", () => {
    test("should handle errors", async () => {
      // Setup mock to throw error
      Model.mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(new Error("DB Error")),
      }));

      // Test error response
      const response = await request(app).post("/endpoint").send({});

      expect(response.status).toBe(500);
    });
  });
});
```

---

## Integration Tests with Supertest

### Testing POST Request Without Files

```javascript
test("should create product without images", async () => {
  // Prepare test data
  const productData = {
    title: "Laptop",
    description: "High-performance laptop",
    price: {
      amount: 50000,
      currency: "INR",
    },
    seller: "507f1f77bcf86cd799439011",
  };

  // Mock database save
  const mockProduct = {
    _id: "507f1f77bcf86cd799439012",
    ...productData,
    images: [],
  };

  Product.mockImplementation(() => ({
    save: jest.fn().mockResolvedValue(mockProduct),
  }));

  // Make request
  const response = await request(app).post("/api/products").send(productData);

  // Verify response
  expect(response.status).toBe(201);
  expect(response.body.success).toBe(true);
  expect(response.body.product.title).toBe("Laptop");
  expect(response.body.product._id).toBe("507f1f77bcf86cd799439012");
});
```

### Testing GET Request

```javascript
test("should fetch all products", async () => {
  // Mock data
  const mockProducts = [
    { _id: "1", title: "Product 1", price: { amount: 100 } },
    { _id: "2", title: "Product 2", price: { amount: 200 } },
  ];

  // Mock find method
  Product.find = jest.fn().mockResolvedValue(mockProducts);

  // Make request
  const response = await request(app).get("/api/products");

  // Assertions
  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.products).toHaveLength(2);
  expect(response.body.products[0].title).toBe("Product 1");
  expect(Product.find).toHaveBeenCalled();
});
```

---

## Unit Tests with Mocks

### Testing Controller Method Directly

```javascript
const ProductController = require("../controllers/product.controller");

describe("ProductController.createProduct", () => {
  let mockReq;
  let mockRes;
  let mockImageKit;

  beforeEach(() => {
    jest.clearAllMocks();
    mockImageKit = ImageKit.mock.results[0].value;

    // Create mock request and response objects
    mockReq = {
      body: {},
      files: [],
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  test("should save product data correctly", async () => {
    // Setup request data
    mockReq.body = {
      title: "Test Product",
      price: { amount: 100, currency: "INR" },
      seller: "507f1f77bcf86cd799439011",
    };
    mockReq.files = [];

    // Setup mock product
    const mockProduct = {
      _id: "507f1f77bcf86cd799439012",
      ...mockReq.body,
      images: [],
      save: jest.fn().mockResolvedValue(this),
    };

    Product.mockImplementation(() => mockProduct);

    // Call controller
    await ProductController.createProduct(mockReq, mockRes);

    // Verify product was saved
    expect(mockProduct.save).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Product created successfully",
      }),
    );
  });
});
```

---

## File Upload Testing

### Single File Upload

```javascript
test("should handle single image upload", async () => {
  const productData = {
    title: "Product with Image",
    price: { amount: 100, currency: "INR" },
    seller: "507f1f77bcf86cd799439011",
  };

  // Mock ImageKit response
  const mockImageResponse = {
    url: "https://ik.imagekit.io/test/image.jpg",
    thumbnailUrl: "https://ik.imagekit.io/test/tr:w-200/image.jpg",
    fileId: "file-123",
  };

  mockImageKit.upload.mockResolvedValue(mockImageResponse);

  // Mock product
  const mockProduct = {
    _id: "507f1f77bcf86cd799439012",
    ...productData,
    images: [mockImageResponse],
  };

  Product.mockImplementation(() => ({
    save: jest.fn().mockResolvedValue(mockProduct),
  }));

  // Make request with file
  const response = await request(app)
    .post("/api/products")
    .field("title", productData.title)
    .field("price[amount]", productData.price.amount)
    .field("price[currency]", productData.price.currency)
    .field("seller", productData.seller)
    .attach("images", Buffer.from("fake image data"), "photo.jpg");

  // Verify
  expect(response.status).toBe(201);
  expect(response.body.product.images).toHaveLength(1);
  expect(response.body.product.images[0].url).toBe(mockImageResponse.url);
  expect(mockImageKit.upload).toHaveBeenCalledTimes(1);
  expect(mockImageKit.upload).toHaveBeenCalledWith(
    expect.objectContaining({
      file: expect.any(Buffer),
      fileName: expect.stringMatching(/photo\.jpg$/),
      folder: "/products/",
    }),
  );
});
```

### Multiple File Upload

```javascript
test("should handle multiple image uploads", async () => {
  const mockImages = [
    {
      url: "https://ik.imagekit.io/test/img1.jpg",
      thumbnailUrl: "https://ik.imagekit.io/test/tr:w-200/img1.jpg",
      fileId: "file-1",
    },
    {
      url: "https://ik.imagekit.io/test/img2.jpg",
      thumbnailUrl: "https://ik.imagekit.io/test/tr:w-200/img2.jpg",
      fileId: "file-2",
    },
  ];

  // Mock sequential responses
  mockImageKit.upload
    .mockResolvedValueOnce(mockImages[0])
    .mockResolvedValueOnce(mockImages[1]);

  // Mock product
  const mockProduct = {
    _id: "507f1f77bcf86cd799439012",
    title: "Multi-image Product",
    price: { amount: 100, currency: "INR" },
    seller: "507f1f77bcf86cd799439011",
    images: mockImages,
  };

  Product.mockImplementation(() => ({
    save: jest.fn().mockResolvedValue(mockProduct),
  }));

  // Make request with multiple files
  const response = await request(app)
    .post("/api/products")
    .field("title", mockProduct.title)
    .field("price[amount]", mockProduct.price.amount)
    .field("price[currency]", mockProduct.price.currency)
    .field("seller", mockProduct.seller)
    .attach("images", Buffer.from("image data 1"), "photo1.jpg")
    .attach("images", Buffer.from("image data 2"), "photo2.jpg");

  // Verify both uploads
  expect(response.status).toBe(201);
  expect(response.body.product.images).toHaveLength(2);
  expect(mockImageKit.upload).toHaveBeenCalledTimes(2);

  // Verify correct files were uploaded
  expect(mockImageKit.upload).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({
      fileName: expect.stringMatching(/photo1\.jpg$/),
    }),
  );
  expect(mockImageKit.upload).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({
      fileName: expect.stringMatching(/photo2\.jpg$/),
    }),
  );
});
```

---

## Error Handling Tests

### Validation Error

```javascript
test("should return 400 for missing required fields", async () => {
  // Request missing title
  const invalidData = {
    description: "Missing title",
    price: { amount: 100, currency: "INR" },
    seller: "507f1f77bcf86cd799439011",
  };

  const response = await request(app).post("/api/products").send(invalidData);

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toContain("required fields");
});
```

### ImageKit Upload Error

```javascript
test("should handle ImageKit upload failure", async () => {
  // Mock ImageKit to fail
  mockImageKit.upload.mockRejectedValue(
    new Error("ImageKit API rate limit exceeded"),
  );

  const response = await request(app)
    .post("/api/products")
    .field("title", "Product")
    .field("price[amount]", 100)
    .field("price[currency]", "INR")
    .field("seller", "507f1f77bcf86cd799439011")
    .attach("images", Buffer.from("data"), "image.jpg");

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toContain("Error uploading image");
  expect(response.body.error).toContain("ImageKit API");
});
```

### Database Error

```javascript
test("should handle database errors gracefully", async () => {
  const mockProduct = {
    save: jest.fn().mockRejectedValue(new Error("MongoDB connection lost")),
  };

  Product.mockImplementation(() => mockProduct);

  const response = await request(app)
    .post("/api/products")
    .send({
      title: "Test",
      price: { amount: 100, currency: "INR" },
      seller: "507f1f77bcf86cd799439011",
    });

  expect(response.status).toBe(500);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toContain("Error creating product");
  expect(response.body.error).toContain("MongoDB");
});
```

### Partial Failure (Some uploads succeed, some fail)

```javascript
test("should handle partial upload failure", async () => {
  // First upload succeeds, second fails
  mockImageKit.upload
    .mockResolvedValueOnce({
      url: "https://ik.imagekit.io/test/img1.jpg",
      fileId: "file-1",
    })
    .mockRejectedValueOnce(new Error("File too large"));

  const response = await request(app)
    .post("/api/products")
    .field("title", "Product")
    .field("price[amount]", 100)
    .field("price[currency]", "INR")
    .field("seller", "507f1f77bcf86cd799439011")
    .attach("images", Buffer.from("data1"), "image1.jpg")
    .attach("images", Buffer.from("data2"), "image2.jpg");

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toContain("Error uploading image");
  // Product should not be created in this case
  expect(mockImageKit.upload).toHaveBeenCalledTimes(2);
});
```

---

## Common Assertions

### Response Assertions

```javascript
// Status code
expect(response.status).toBe(201);
expect(response.status).toEqual(200);

// Response body properties
expect(response.body).toHaveProperty("success");
expect(response.body.success).toBe(true);
expect(response.body.message).toBeDefined();

// String matching
expect(response.body.message).toContain("successfully");
expect(response.body.error).toMatch(/ImageKit/);

// Array assertions
expect(response.body.products).toHaveLength(3);
expect(response.body.images).toContain(
  expect.objectContaining({
    url: "https://...",
  }),
);
```

### Mock Assertions

```javascript
// Called once
expect(mockFunction).toHaveBeenCalled();
expect(mockFunction).toHaveBeenCalledTimes(1);

// Called with specific arguments
expect(mockFunction).toHaveBeenCalledWith(expectedArg);
expect(mockFunction).toHaveBeenCalledWith(
  expect.objectContaining({ key: "value" }),
);

// Called in specific order
expect(mockFunction1).toHaveBeenCalledBefore(mockFunction2);

// Not called
expect(mockFunction).not.toHaveBeenCalled();

// Verify nth call
expect(mockFunction).toHaveBeenNthCalledWith(1, expectedArg);
```

### Object Assertions

```javascript
// Object contains properties
expect(object).toMatchObject({
  id: expect.any(String),
  name: "John",
});

// Exact match
expect(object).toEqual({
  id: "123",
  name: "John",
});

// Property exists
expect(object).toHaveProperty("id");
expect(object).toHaveProperty("user.name");
```

---

## Running Specific Tests

```bash
# Run specific test file
npm test -- product.controller.test.js

# Run tests matching pattern
npm test -- --testNamePattern="should create"

# Run tests in specific describe block
npm test -- --testNamePattern="Validation Errors"

# Run with coverage
npm test -- --coverage

# Debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

---

## Best Practices

1. **Use meaningful test names** that describe what is being tested
2. **Follow AAA pattern**: Arrange, Act, Assert
3. **Mock external dependencies** to isolate the unit
4. **Use beforeEach** to reset mocks between tests
5. **Test both success and failure paths**
6. **Use descriptive assertions** with clear error messages
7. **Keep tests focused** on one thing each
8. **Group related tests** in describe blocks
9. **Avoid test interdependencies** - each test should be independent
10. **Use test data factories** for complex object creation

---

**For more examples, see the actual test files:**

- `src/routes/product.routes.test.js` - Integration tests
- `src/controllers/product.controller.test.js` - Unit tests
