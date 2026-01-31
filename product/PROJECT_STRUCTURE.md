# Project Directory Structure

```
product/
│
├── jest.config.js                          # Jest configuration
├── jest.setup.js                           # Jest environment setup
├── package.json                            # Project dependencies & scripts
├── server.js                               # Express server entry point
│
├── .env                                    # Environment variables (git ignored)
├── .env.example                            # Environment variables template
│
├── SETUP_SUMMARY.md                        # Setup summary & file overview
├── TEST_README.md                          # Comprehensive testing guide
├── QUICK_START.md                          # Quick start guide
├── TEST_EXAMPLES.md                        # Test patterns & examples
│
├── src/
│   ├── app.js                              # Express app configuration
│   │
│   ├── controllers/
│   │   ├── product.controller.js           # POST/GET endpoint logic
│   │   └── product.controller.test.js      # Unit tests (12+ tests)
│   │
│   ├── db/
│   │   └── db.js                          # MongoDB connection
│   │
│   ├── models/
│   │   └── product.model.js               # Product schema
│   │
│   ├── routes/
│   │   ├── product.routes.js              # Route definitions
│   │   └── product.routes.test.js         # Integration tests (65+ tests)
│   │
│   └── middlewares/                       # (For future middleware)
│
└── node_modules/                          # Dependencies (auto-generated)
```

## File Descriptions

### Root Configuration Files

- **jest.config.js**: Configures Jest test runner
  - Test environment: Node.js
  - Test patterns, timeout, coverage settings
- **jest.setup.js**: Sets up test environment
  - Environment variables for testing
  - MongoDB test URI
  - ImageKit test credentials

- **package.json**: Project configuration
  - Dependencies (Express, Mongoose, Multer, ImageKit)
  - DevDependencies (Jest, Supertest)
  - Scripts (test, test:watch, test:coverage)

### Documentation Files

- **SETUP_SUMMARY.md**: Complete setup overview
  - Files created/modified
  - Test statistics
  - Getting started guide

- **TEST_README.md**: Comprehensive testing documentation
  - Installation & setup
  - Test descriptions
  - Mocking strategies
  - API specifications
  - Best practices

- **QUICK_START.md**: Quick reference guide
  - 3-step setup
  - Running tests
  - Example usage
  - Troubleshooting

- **TEST_EXAMPLES.md**: Practical testing patterns
  - Test structure examples
  - Integration test examples
  - Unit test examples
  - File upload testing
  - Error handling patterns
  - Common assertions

### Server Files

- **server.js**: Express server entry point
  - Loads environment variables
  - Connects to database
  - Starts server on port 3001

- **src/app.js**: Express application setup
  - Middleware configuration (JSON, cookies)
  - Route mounting (/api/products)
  - Error handling

### Controllers

- **src/controllers/product.controller.js**: Business logic
  - `createProduct()`: POST endpoint
    - Validates input
    - Uploads images to ImageKit
    - Saves product to MongoDB
  - `getProducts()`: GET endpoint
    - Retrieves all products

- **src/controllers/product.controller.test.js**: Unit tests
  - Tests controller methods directly
  - Mocks database and ImageKit
  - 12+ test cases covering success/failure scenarios

### Routes

- **src/routes/product.routes.js**: Route definitions
  - Multer configuration (memory storage, max 10 files)
  - POST /api/products - Create product with images
  - GET /api/products - List products

- **src/routes/product.routes.test.js**: Integration tests
  - Tests complete HTTP request/response cycle
  - 65+ test cases
  - Categories:
    - Successful product creation (4 tests)
    - Validation errors (5 tests)
    - ImageKit upload errors (2 tests)
    - Database errors (1 test)
    - Edge cases (5 tests)

### Database

- **src/db/db.js**: MongoDB connection
  - Uses Mongoose
  - Connects to MONGO_URI from environment

### Models

- **src/models/product.model.js**: Product schema
  - title (String, required)
  - description (String)
  - price (Object)
    - amount (Number, required)
    - currency (String, enum: USD/INR, default: INR)
  - seller (ObjectId, required)
  - images (Array of objects)
    - url (String)
    - thumbnailUrl (String)
    - id (String)

### Environment Files

- **.env**: Runtime environment variables (NOT in git)
  - MONGO_URI
  - IMAGEKIT_PUBLIC_KEY
  - IMAGEKIT_PRIVATE_KEY
  - IMAGEKIT_URL_ENDPOINT
  - NODE_ENV
  - PORT

- **.env.example**: Template for environment variables
  - Copy to .env and fill in your values

---

## File Statistics

| Category      | Files  | Purpose                     |
| ------------- | ------ | --------------------------- |
| Configuration | 3      | Jest, package.json, server  |
| Documentation | 4      | Setup guides, test examples |
| Controllers   | 2      | Logic + Tests               |
| Routes        | 2      | Endpoints + Tests           |
| Models        | 1      | Schema definitions          |
| Database      | 1      | Connection setup            |
| Environment   | 2      | Config templates            |
| **TOTAL**     | **15** | **Complete testing setup**  |

---

## How Files Work Together

### Test Execution Flow

```
package.json (npm test)
    ↓
jest.config.js (configuration)
    ↓
jest.setup.js (environment variables)
    ↓
Test Files (*.test.js)
    ├── product.routes.test.js (Integration tests)
    │   ├── Mocks: ImageKit, Product model
    │   ├── Tests: HTTP endpoints
    │   └── Uses: app.js, routes, controllers
    │
    └── product.controller.test.js (Unit tests)
        ├── Mocks: ImageKit, Product model
        ├── Tests: Controller methods
        └── Uses: controllers
```

### Application Flow

```
server.js
    ↓
src/app.js (Express app setup)
    ↓
src/routes/product.routes.js (Route definitions)
    ↓
src/controllers/product.controller.js (Business logic)
    ├── Validates input
    ├── Uploads to ImageKit
    └── Saves to MongoDB
        ↓
    src/models/product.model.js (Schema)
        ↓
    src/db/db.js (Connection)
```

---

## Getting Started

1. **Read**: `QUICK_START.md` - 5-minute setup
2. **Review**: `TEST_README.md` - Detailed documentation
3. **Learn**: `TEST_EXAMPLES.md` - Practical examples
4. **Run**: `npm install && npm test`
5. **Explore**: Test files in `src/controllers/` and `src/routes/`

---

## Development Workflow

1. **Write Code**
   - Implement feature in controller or route

2. **Write Tests**
   - Create tests in `*.test.js` file
   - Mock external dependencies
   - Cover success and failure cases

3. **Run Tests**

   ```bash
   npm test              # Run all tests
   npm run test:watch   # Watch mode
   npm run test:coverage # Coverage report
   ```

4. **Verify**
   - Check test output
   - Ensure all tests pass
   - Review coverage report

5. **Deploy**
   - Once all tests pass
   - Code is ready for production

---

## Key Technologies

- **Jest**: Testing framework
- **Supertest**: HTTP testing
- **Express**: Web framework
- **Mongoose**: MongoDB ODM
- **Multer**: File uploads
- **ImageKit**: Image management

---

For detailed information, see the documentation files in the project root.
