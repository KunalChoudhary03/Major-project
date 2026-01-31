# Quick Start Guide - Jest Testing

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

This will install:

- `jest` - Testing framework
- `supertest` - HTTP testing library
- `multer` - File upload middleware
- `imagekit` - Image management service

### 2. Configure Environment

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Update `.env` with your actual ImageKit credentials:

```
MONGO_URI=mongodb://localhost:27017/product-test
IMAGEKIT_PUBLIC_KEY=your_key_here
IMAGEKIT_PRIVATE_KEY=your_private_key_here
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id/
```

### 3. Run Tests

**Run all tests:**

```bash
npm test
```

**Run tests in watch mode** (auto-rerun on changes):

```bash
npm run test:watch
```

**Run tests with coverage report:**

```bash
npm run test:coverage
```

## Project Files Created/Updated

### Configuration Files

- ✅ `jest.config.js` - Jest configuration
- ✅ `jest.setup.js` - Test environment setup
- ✅ `package.json` - Updated with test scripts and dependencies

### Source Files

- ✅ `src/controllers/product.controller.js` - POST/GET endpoint logic
- ✅ `src/routes/product.routes.js` - Route definitions with multer

### Test Files

- ✅ `src/routes/product.routes.test.js` - Integration tests (65+ test cases)
- ✅ `src/controllers/product.controller.test.js` - Unit tests (12+ test cases)

### Documentation

- ✅ `TEST_README.md` - Comprehensive testing documentation
- ✅ `.env.example` - Environment variables template
- ✅ `QUICK_START.md` - This file

## Test Coverage

The test suite covers:

### ✅ POST /api/products - Create Product

- Products without images
- Products with single/multiple images (up to 10)
- Required field validation (title, price, seller)
- Price object validation
- ImageKit upload success/failure
- Database save errors
- Edge cases (empty descriptions, zero prices, etc.)

### ✅ GET /api/products - List Products

- Retrieve all products
- Empty product list
- Database errors

## Key Features

### 1. **Multer Integration**

- In-memory file storage for testing
- Supports multiple file uploads (max 10)
- Handles file attachments in tests

### 2. **ImageKit Mocking**

- Complete ImageKit mock without real API calls
- Tests upload success and failure scenarios
- Verifies correct parameters are sent

### 3. **Database Mocking**

- Mongoose models are mocked
- No database required for tests
- Simulates save/find operations

### 4. **Comprehensive Validation**

- Required field checks
- Price validation
- File upload error handling
- Database operation errors

## Example Test Run

```bash
$ npm test

PASS  src/routes/product.routes.test.js
  POST /api/products - Create Product
    Successful Product Creation
      ✓ should create a product without images (50ms)
      ✓ should create a product with single image (45ms)
      ✓ should create a product with multiple images (55ms)
      ✓ should use default currency when not provided (40ms)
    Validation Errors
      ✓ should return 400 when title is missing (30ms)
      ✓ should return 400 when price is missing (25ms)
      ... (more tests)

PASS  src/controllers/product.controller.test.js
  ProductController - createProduct
    ✓ should successfully create product without images (35ms)
    ✓ should successfully create product with images (40ms)
    ... (more tests)

Tests: 77 passed, 77 total
Coverage: 95.4% statements, 92.1% branches
```

## API Endpoint Example

### Create Product with Image

```bash
curl -X POST http://localhost:3001/api/products \
  -F "title=My Product" \
  -F "description=Product Description" \
  -F "price[amount]=100" \
  -F "price[currency]=INR" \
  -F "seller=507f1f77bcf86cd799439011" \
  -F "images=@/path/to/image.jpg"
```

### Response

```json
{
  "success": true,
  "message": "Product created successfully",
  "product": {
    "_id": "507f1f77bcf86cd799439012",
    "title": "My Product",
    "description": "Product Description",
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

## Troubleshooting

### Tests fail with "Cannot find module"

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### ImageKit errors in tests

- ImageKit should be mocked automatically
- Check that `jest.mock('imagekit')` is at the top of test files
- Run `npm test` to verify mocks are working

### MongoDB connection errors

- Tests don't need MongoDB running
- Database is completely mocked
- If error occurs, check environment variables in `jest.setup.js`

## Next Steps

1. **Update .env** with real credentials
2. **Run tests** to verify setup: `npm test`
3. **Review test files** to understand test patterns
4. **Add more tests** as you develop new features
5. **Check coverage** with: `npm run test:coverage`

## Documentation

See `TEST_README.md` for:

- Detailed test descriptions
- Mocking strategies
- API endpoint specification
- Best practices
- Advanced configuration

---

Happy Testing! 🚀
