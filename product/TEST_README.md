# Jest Testing Setup for Product API

This document explains the Jest testing setup for the POST `/api/products/` endpoint with Multer and ImageKit integration.

## Installation

All required dependencies have been added to `package.json`. Install them by running:

```bash
npm install
```

### Dependencies Added:

- **jest**: Testing framework
- **supertest**: HTTP assertion library for testing Express routes
- **multer**: Middleware for handling file uploads
- **imagekit**: ImageKit SDK for image management

## Project Structure

```
product/
├── jest.config.js              # Jest configuration
├── jest.setup.js               # Jest setup file (environment variables)
├── package.json                # Project dependencies
├── server.js                   # Express server entry point
├── src/
│   ├── app.js                  # Express app configuration
│   ├── controllers/
│   │   ├── product.controller.js       # Controller logic
│   │   └── product.controller.test.js  # Unit tests for controller
│   ├── db/
│   │   └── db.js               # Database connection
│   ├── models/
│   │   └── product.model.js    # Product schema
│   └── routes/
│       ├── product.routes.js           # Route definitions
│       └── product.routes.test.js      # Integration tests for routes
└── README.md
```

## Running Tests

### Run all tests:

```bash
npm test
```

### Run tests in watch mode (re-runs on file changes):

```bash
npm run test:watch
```

### Run tests with coverage report:

```bash
npm run test:coverage
```

## Test Files Overview

### 1. **product.routes.test.js** - Integration Tests

This file tests the complete POST `/api/products/` endpoint with actual HTTP requests.

#### Test Suites:

#### A. **Successful Product Creation**

- ✅ Create product without images
- ✅ Create product with single image
- ✅ Create product with multiple images (up to 10)
- ✅ Use default currency when not provided

#### B. **Validation Errors**

- ✅ Missing title returns 400
- ✅ Missing price returns 400
- ✅ Missing seller returns 400
- ✅ Missing price.amount returns 400
- ✅ Missing price.currency returns 400

#### C. **ImageKit Upload Errors**

- ✅ Handle ImageKit upload failures
- ✅ Handle partial image upload failure (fails on second image)

#### D. **Database Errors**

- ✅ Handle database save failures

#### E. **Edge Cases**

- ✅ Product without description
- ✅ Empty string title
- ✅ Zero price amount
- ✅ Negative price amount
- ✅ Maximum allowed images (10)

### 2. **product.controller.test.js** - Unit Tests

This file tests the controller methods independently with mocked dependencies.

#### Test Suites:

#### A. **createProduct Method**

- ✅ Create product without images
- ✅ Create product with images
- ✅ Missing required fields validation
- ✅ Incomplete price object validation
- ✅ ImageKit upload failure handling
- ✅ Database save failure handling
- ✅ Verify ImageKit upload request format

#### B. **getProducts Method**

- ✅ Successfully retrieve all products
- ✅ Return empty array when no products exist
- ✅ Handle database query errors

## Test Configuration Details

### jest.config.js

```javascript
{
  testEnvironment: 'node',              // Node.js environment
  coveragePathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/*.test.js', '**/*.spec.js'],
  testTimeout: 10000,                   // 10 second timeout
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
}
```

### jest.setup.js

Sets up environment variables for testing:

```javascript
process.env.MONGO_URI = "mongodb://localhost:27017/product-test";
process.env.IMAGEKIT_PUBLIC_KEY = "test-public-key";
process.env.IMAGEKIT_PRIVATE_KEY = "test-private-key";
process.env.IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/test/";
```

## Mocking Strategy

### ImageKit Mocking

ImageKit is mocked using Jest's `jest.mock()` to avoid actual API calls:

```javascript
jest.mock("imagekit", () => {
  return jest.fn().mockImplementation(() => ({
    upload: jest.fn(),
  }));
});
```

This allows tests to:

- Control upload responses
- Simulate failures
- Verify upload calls with correct parameters

### Product Model Mocking

The Product model is mocked to avoid database dependencies:

```javascript
jest.mock("../models/product.model");

// In tests:
Product.mockImplementation(() => ({
  save: jest.fn().mockResolvedValue(mockProduct),
}));
```

## API Endpoint Specification

### POST /api/products/

**Request:**

```
Headers:
  Content-Type: multipart/form-data

Body:
  - title (required): string
  - description (optional): string
  - price (required): object
    - amount (required): number
    - currency (optional): 'USD' | 'INR' (default: 'INR')
  - seller (required): string (MongoDB ObjectId)
  - images (optional): file[] (max 10 files)
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "Product created successfully",
  "product": {
    "_id": "507f1f77bcf86cd799439012",
    "title": "Product Name",
    "description": "Description",
    "price": {
      "amount": 100,
      "currency": "INR"
    },
    "seller": "507f1f77bcf86cd799439011",
    "images": [
      {
        "url": "https://ik.imagekit.io/test/image.jpg",
        "thumbnailUrl": "https://ik.imagekit.io/test/tr:w-200/image.jpg",
        "id": "file-123"
      }
    ]
  }
}
```

**Error Response (400/500):**

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## Example Test Cases

### Test: Create Product Without Images

```javascript
test("should create a product without images", async () => {
  const productData = {
    title: "Test Product",
    description: "A test product description",
    price: { amount: 100, currency: "INR" },
    seller: "507f1f77bcf86cd799439011",
  };

  const response = await request(app).post("/api/products").send(productData);

  expect(response.status).toBe(201);
  expect(response.body.success).toBe(true);
  expect(response.body.product).toHaveProperty("_id");
});
```

### Test: Create Product With Images

```javascript
test("should create a product with multiple images", async () => {
  const response = await request(app)
    .post("/api/products")
    .field("title", "Product")
    .field("price[amount]", 100)
    .field("price[currency]", "INR")
    .field("seller", "507f1f77bcf86cd799439011")
    .attach("images", Buffer.from("image1"), "test1.jpg")
    .attach("images", Buffer.from("image2"), "test2.jpg");

  expect(response.status).toBe(201);
  expect(response.body.product.images).toHaveLength(2);
});
```

### Test: Validation Error

```javascript
test("should return 400 when title is missing", async () => {
  const response = await request(app)
    .post("/api/products")
    .send({
      price: { amount: 100, currency: "INR" },
      seller: "507f1f77bcf86cd799439011",
    });

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
});
```

## Code Coverage

To view coverage report:

```bash
npm run test:coverage
```

This generates a coverage report showing:

- Statement coverage
- Branch coverage
- Function coverage
- Line coverage

Coverage files are generated in `./coverage/` directory.

## Best Practices Used in Tests

1. **Isolation**: Each test is independent and uses `beforeEach` to reset mocks
2. **Clear Naming**: Test names clearly describe what is being tested
3. **Arrange-Act-Assert**: Tests follow AAA pattern for clarity
4. **Mocking**: External dependencies (ImageKit, Database) are mocked
5. **Error Handling**: Tests cover success, failure, and edge cases
6. **Coverage**: Multiple test cases ensure comprehensive coverage

## Troubleshooting

### Tests Not Running

```bash
# Make sure jest is installed
npm install jest --save-dev

# Run with explicit config
npm test -- --config jest.config.js
```

### Mock Not Working

- Ensure mocks are defined before imports
- Use `jest.clearAllMocks()` in `beforeEach`
- Verify mock implementation matches actual module

### Database/ImageKit Errors in Tests

- These should be mocked and not call real services
- Check that `jest.mock()` is at the top of the test file
- Verify mock implementations are properly set up

## Adding New Tests

When adding new endpoints or features:

1. Create a `.test.js` file next to the code being tested
2. Import the required modules and set up mocks
3. Use descriptive test names with `describe` blocks
4. Follow the Arrange-Act-Assert pattern
5. Test both success and failure scenarios

Example:

```javascript
describe('POST /api/products', () => {
  describe('Successful Requests', () => {
    test('should do X', async () => {
      // Arrange
      const data = { ... };

      // Act
      const response = await request(app)
        .post('/api/products')
        .send(data);

      // Assert
      expect(response.status).toBe(201);
    });
  });

  describe('Error Handling', () => {
    test('should handle Y error', async () => {
      // ...
    });
  });
});
```

## References

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Multer Documentation](https://github.com/expressjs/multer)
- [ImageKit Node.js SDK](https://github.com/imagekit-developer/imagekit-nodejs)
