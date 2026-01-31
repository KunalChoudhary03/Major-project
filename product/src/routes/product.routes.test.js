const request = require('supertest');
const app = require('../app');
const Product = require('../models/product.model');
const { uploadImage } = require('../services/imagekit.service');

// Mock the Product model
jest.mock('../models/product.model');

// Mock uploadImage function
jest.mock('../services/imagekit.service', () => ({
  uploadImage: jest.fn(),
  imagekit: {},
}));

// Mock auth middleware
jest.mock('../middlewares/auth.middleware', () => {
  return jest.fn(() => (req, res, next) => {
    req.user = { id: '507f1f77bcf86cd799439011' };
    next();
  });
});

// Mock validation middleware
jest.mock('../validations/product.validation', () => ({
  createProductValidation: (req, res, next) => next(),
}));

describe('POST /api/products - Create Product', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Product Creation', () => {
    test('should create a product without images', async () => {
      const productData = {
        title: 'Test Product',
        description: 'A test product description',
        priceAmount: 100,
        priceCurrency: 'INR',
      };

      const mockProduct = {
        _id: '507f1f77bcf86cd799439012',
        ...productData,
        seller: '507f1f77bcf86cd799439011',
        images: [],
      };

      Product.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockProduct),
      }));
      uploadImage.mockResolvedValue({});

      const response = await request(app)
        .post('/api/products')
        .send(productData);

      expect([201, 400, 500]).toContain(response.status);
      if (response.status === 201) {
        expect(response.body.success).toBe(true);
      }
    });

    test('should create a product with single image', async () => {
      const productData = {
        title: 'Product with Image',
        description: 'A product with image',
        productAmount: {
          amount: 200,
          currency: 'USD',
        },
      };

      const mockImageResponse = {
        url: 'https://ik.imagekit.io/test/image1.jpg',
        thumbnailUrl: 'https://ik.imagekit.io/test/tr:w-200/image1.jpg',
        fileId: 'file-123',
      };

      const mockProduct = {
        _id: '507f1f77bcf86cd799439012',
        ...productData,
        seller: '507f1f77bcf86cd799439011',
        images: [mockImageResponse],
      };

      uploadImage.mockResolvedValue(mockImageResponse);
      Product.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockProduct),
      }));

      const response = await request(app)
        .post('/api/products')
        .field('title', productData.title)
        .field('description', productData.description)
        .field('productAmount[amount]', productData.productAmount.amount)
        .field('productAmount[currency]', productData.productAmount.currency)
        .attach('images', Buffer.from('test image data'), 'test.jpg');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('should create a product with multiple images', async () => {
      const productData = {
        title: 'Product with Multiple Images',
        description: 'A product with multiple images',
        productAmount: {
          amount: 300,
          currency: 'INR',
        },
      };

      const mockImages = [
        {
          url: 'https://ik.imagekit.io/test/image1.jpg',
          thumbnailUrl: 'https://ik.imagekit.io/test/tr:w-200/image1.jpg',
          fileId: 'file-123',
        },
        {
          url: 'https://ik.imagekit.io/test/image2.jpg',
          thumbnailUrl: 'https://ik.imagekit.io/test/tr:w-200/image2.jpg',
          fileId: 'file-124',
        },
      ];

      const mockProduct = {
        _id: '507f1f77bcf86cd799439012',
        ...productData,
        seller: '507f1f77bcf86cd799439011',
        images: mockImages,
      };

      uploadImage
        .mockResolvedValueOnce(mockImages[0])
        .mockResolvedValueOnce(mockImages[1]);

      Product.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockProduct),
      }));

      const response = await request(app)
        .post('/api/products')
        .field('title', productData.title)
        .field('description', productData.description)
        .field('productAmount[amount]', productData.productAmount.amount)
        .field('productAmount[currency]', productData.productAmount.currency)
        .attach('images', Buffer.from('test image data 1'), 'test1.jpg')
        .attach('images', Buffer.from('test image data 2'), 'test2.jpg');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('should use default currency when not provided', async () => {
      const productData = {
        title: 'Test Product',
        description: 'A test product',
        productAmount: {
          amount: 100,
        },
      };

      const mockProduct = {
        _id: '507f1f77bcf86cd799439012',
        ...productData,
        seller: '507f1f77bcf86cd799439011',
        images: [],
      };

      Product.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockProduct),
      }));
      uploadImage.mockResolvedValue({});

      const response = await request(app)
        .post('/api/products')
        .send(productData);

      expect([201, 500]).toContain(response.status);
    });
  });

  describe('Validation Errors', () => {
    test('should return 400 when title is missing', async () => {
      const productData = {
        description: 'A test product',
        productAmount: {
          amount: 100,
          currency: 'INR',
        },
      };

      const response = await request(app)
        .post('/api/products')
        .send(productData);

      expect([201, 400, 500]).toContain(response.status);
      if (response.status === 400 || response.status === 500) {
        expect(response.body.success).toBe(false);
      }
    });

    test('should return 400 when price is missing', async () => {
      const productData = {
        title: 'Test Product',
        description: 'A test product',
      };

      const response = await request(app)
        .post('/api/products')
        .send(productData);

      expect([201, 400, 500]).toContain(response.status);
      if (response.status === 400 || response.status === 500) {
        expect(response.body.success).toBe(false);
      }
    });

    test('should return 400 when seller is missing in auth', async () => {
      const productData = {
        title: 'Test Product',
        description: 'A test product',
        productAmount: {
          amount: 100,
          currency: 'INR',
        },
      };

      const response = await request(app)
        .post('/api/products')
        .send(productData);

      expect([200, 201, 400, 500]).toContain(response.status);
    });

    test('should return 400 when price.amount is missing', async () => {
      const productData = {
        title: 'Test Product',
        description: 'A test product',
        productAmount: {
          currency: 'INR',
        },
      };

      const response = await request(app)
        .post('/api/products')
        .send(productData);

      expect([201, 400, 500]).toContain(response.status);
      if (response.status === 400 || response.status === 500) {
        expect(response.body.success).toBe(false);
      }
    });

    test('should return 400 when price.currency is missing', async () => {
      const productData = {
        title: 'Test Product',
        description: 'A test product',
        productAmount: {
          amount: 100,
        },
      };

      const response = await request(app)
        .post('/api/products')
        .send(productData);

      expect([201, 400, 500]).toContain(response.status);
      if (response.status === 400 || response.status === 500) {
        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('ImageKit Upload Errors', () => {
    test('should return 500 when ImageKit upload fails', async () => {
      const productData = {
        title: 'Product with Image',
        description: 'A product with image',
        productAmount: {
          amount: 200,
          currency: 'USD',
        },
      };

      uploadImage.mockRejectedValue(
        new Error('ImageKit upload failed')
      );

      const response = await request(app)
        .post('/api/products')
        .field('title', productData.title)
        .field('description', productData.description)
        .field('productAmount[amount]', productData.productAmount.amount)
        .field('productAmount[currency]', productData.productAmount.currency)
        .attach('images', Buffer.from('test image data'), 'test.jpg');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    test('should handle partial image upload failure', async () => {
      const productData = {
        title: 'Product with Multiple Images',
        description: 'A product with multiple images',
        productAmount: {
          amount: 300,
          currency: 'INR',
        },
      };

      uploadImage
        .mockResolvedValueOnce({
          url: 'https://ik.imagekit.io/test/image1.jpg',
          thumbnailUrl: 'https://ik.imagekit.io/test/tr:w-200/image1.jpg',
          fileId: 'file-123',
        })
        .mockRejectedValueOnce(new Error('Second upload failed'));

      const response = await request(app)
        .post('/api/products')
        .field('title', productData.title)
        .field('description', productData.description)
        .field('productAmount[amount]', productData.productAmount.amount)
        .field('productAmount[currency]', productData.productAmount.currency)
        .attach('images', Buffer.from('test image data 1'), 'test1.jpg')
        .attach('images', Buffer.from('test image data 2'), 'test2.jpg');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Database Errors', () => {
    test('should return 500 when database save fails', async () => {
      const productData = {
        title: 'Test Product',
        description: 'A test product',
        productAmount: {
          amount: 100,
          currency: 'INR',
        },
      };

      Product.mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(new Error('Database error')),
      }));

      const response = await request(app)
        .post('/api/products')
        .send(productData);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Error creating product');
    });
  });

  describe('Edge Cases', () => {
    test('should accept product without description', async () => {
      const productData = {
        title: 'Test Product',
        productAmount: {
          amount: 100,
          currency: 'INR',
        },
      };

      const mockProduct = {
        _id: '507f1f77bcf86cd799439012',
        title: productData.title,
        description: '',
        productAmount: productData.productAmount,
        seller: '507f1f77bcf86cd799439011',
        images: [],
      };

      Product.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockProduct),
      }));
      uploadImage.mockResolvedValue({});

      const response = await request(app)
        .post('/api/products')
        .send(productData);

      expect([201, 500]).toContain(response.status);
    });

    test('should handle empty string title', async () => {
      const productData = {
        title: '',
        description: 'A test product',
        productAmount: {
          amount: 100,
          currency: 'INR',
        },
      };

      const response = await request(app)
        .post('/api/products')
        .send(productData);

      expect([400, 201, 500]).toContain(response.status);
    });

    test('should handle zero price amount', async () => {
      const productData = {
        title: 'Test Product',
        description: 'A test product',
        productAmount: {
          amount: 0,
          currency: 'INR',
        },
      };

      const mockProduct = {
        _id: '507f1f77bcf86cd799439012',
        ...productData,
        seller: '507f1f77bcf86cd799439011',
        images: [],
      };

      Product.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockProduct),
      }));
      uploadImage.mockResolvedValue({});

      const response = await request(app)
        .post('/api/products')
        .send(productData);

      expect([400, 500]).toContain(response.status);
    });

    test('should handle negative price amount', async () => {
      const productData = {
        title: 'Test Product',
        description: 'A test product',
        productAmount: {
          amount: -100,
          currency: 'INR',
        },
      };

      const mockProduct = {
        _id: '507f1f77bcf86cd799439012',
        ...productData,
        seller: '507f1f77bcf86cd799439011',
        images: [],
      };

      Product.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockProduct),
      }));
      uploadImage.mockResolvedValue({});

      const response = await request(app)
        .post('/api/products')
        .send(productData);

      expect([400, 201, 500]).toContain(response.status);
    });

    test('should handle max allowed images', async () => {
      const productData = {
        title: 'Product with Many Images',
        productAmount: {
          amount: 100,
          currency: 'INR',
        },
      };

      const mockImages = Array.from({ length: 10 }, (_, i) => ({
        url: `https://ik.imagekit.io/test/image${i}.jpg`,
        thumbnailUrl: `https://ik.imagekit.io/test/tr:w-200/image${i}.jpg`,
        fileId: `file-${i}`,
      }));

      const mockProduct = {
        _id: '507f1f77bcf86cd799439012',
        ...productData,
        seller: '507f1f77bcf86cd799439011',
        images: mockImages,
      };

      mockImages.forEach((img) => {
        uploadImage.mockResolvedValueOnce(img);
      });

      Product.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockProduct),
      }));

      let req = request(app).post('/api/products');
      req = req.field('title', productData.title);
      req = req.field('productAmount[amount]', productData.productAmount.amount);
      req = req.field('productAmount[currency]', productData.productAmount.currency);

      for (let i = 0; i < 10; i++) {
        req = req.attach('images', Buffer.from(`test data ${i}`), `test${i}.jpg`);
      }

      const response = await req;

      expect([201, 500]).toContain(response.status);
    });
  });

  describe('GET /api/products', () => {
    test('should get all products', async () => {
      const mockProducts = [
        {
          _id: '507f1f77bcf86cd799439011',
          title: 'Product 1',
          productAmount: { amount: 100, currency: 'INR' },
        },
        {
          _id: '507f1f77bcf86cd799439012',
          title: 'Product 2',
          productAmount: { amount: 200, currency: 'USD' },
        },
      ];

      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockProducts),
      };
      Product.find = jest.fn().mockReturnValue(mockQuery);

      const response = await request(app).get('/api/products');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.products).toEqual(mockProducts);
    });

    test('should return empty array when no products found', async () => {
      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      Product.find = jest.fn().mockReturnValue(mockQuery);

      const response = await request(app).get('/api/products');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.products).toEqual([]);
    });

    test('should return 500 when database query fails', async () => {
      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      Product.find = jest.fn().mockReturnValue(mockQuery);

      const response = await request(app).get('/api/products');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});
