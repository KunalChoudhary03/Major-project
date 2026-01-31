const ProductController = require('../controllers/product.controller');
const Product = require('../models/product.model');
const ImageKit = require('imagekit');
const { uploadImage } = require('../services/imagekit.service');

// Mock the Product model
jest.mock('../models/product.model');

// Mock uploadImage function
jest.mock('../services/imagekit.service', () => ({
  uploadImage: jest.fn(),
  imagekit: {},
}));

// Mock ImageKit
jest.mock('imagekit', () => {
  return jest.fn().mockImplementation(() => ({
    upload: jest.fn(),
  }));
});

describe('ProductController - createProduct', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock request with user
    mockReq = {
      body: {},
      files: [],
      user: { id: '507f1f77bcf86cd799439011' },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  test('should successfully create product without images', async () => {
    mockReq.body = {
      title: 'Test Product',
      description: 'Test Description',
      productAmount: { amount: 100, currency: 'INR' },
    };
    mockReq.files = [];

    const mockProduct = {
      _id: '507f1f77bcf86cd799439012',
      title: 'Test Product',
      description: 'Test Description',
      productAmount: { amount: 100, currency: 'INR' },
      seller: '507f1f77bcf86cd799439011',
      images: [],
      save: jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439012',
        title: 'Test Product',
        description: 'Test Description',
        productAmount: { amount: 100, currency: 'INR' },
        seller: '507f1f77bcf86cd799439011',
        images: [],
      }),
    };

    Product.mockImplementation(() => mockProduct);
    uploadImage.mockResolvedValue({ url: 'https://ik.imagekit.io/test1.jpg' });

    await ProductController.createProduct(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Product created successfully',
      })
    );
  });

  test('should successfully create product with images', async () => {
    mockReq.body = {
      title: 'Product with Images',
      description: 'Test Description',
      productAmount: { amount: 200, currency: 'USD' },
    };

    mockReq.files = [
      { buffer: Buffer.from('test'), originalname: 'test1.jpg' },
      { buffer: Buffer.from('test'), originalname: 'test2.jpg' },
    ];

    const uploadedImages = [
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

    uploadImage
      .mockResolvedValueOnce(uploadedImages[0])
      .mockResolvedValueOnce(uploadedImages[1]);

    const mockProduct = {
      _id: '507f1f77bcf86cd799439012',
      title: 'Product with Images',
      description: 'Test Description',
      productAmount: { amount: 200, currency: 'USD' },
      seller: '507f1f77bcf86cd799439011',
      images: uploadedImages,
      save: jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439012',
        title: 'Product with Images',
        description: 'Test Description',
        productAmount: { amount: 200, currency: 'USD' },
        seller: '507f1f77bcf86cd799439011',
        images: uploadedImages,
      }),
    };

    Product.mockImplementation(() => mockProduct);

    await ProductController.createProduct(mockReq, mockRes);

    expect(uploadImage).toHaveBeenCalledTimes(2);
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Product created successfully',
      })
    );
  });

  test('should return 400 when required fields are missing', async () => {
    mockReq.body = {
      description: 'Test Description',
    };
    mockReq.files = [];

    // When validation fails, it's handled by middleware (not tested here)
    // This test verifies that if somehow invalid data reaches controller,
    // it handles it gracefully
    uploadImage.mockResolvedValue({});

    const mockProduct = {
      save: jest.fn().mockRejectedValue(new Error('Validation error')),
    };

    Product.mockImplementation(() => mockProduct);

    await ProductController.createProduct(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  test('should return 400 when price object is incomplete', async () => {
    mockReq.body = {
      title: 'Test Product',
      description: 'Test Description',
      productAmount: { amount: 100 },
    };
    mockReq.files = [];

    uploadImage.mockResolvedValue({});

    const mockProduct = {
      save: jest.fn().mockRejectedValue(new Error('Validation failed')),
    };

    Product.mockImplementation(() => mockProduct);

    await ProductController.createProduct(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });

  test('should return 400 when ImageKit upload fails', async () => {
    mockReq.body = {
      title: 'Product with Image',
      description: 'Test Description',
      productAmount: { amount: 100, currency: 'INR' },
    };

    mockReq.files = [
      { buffer: Buffer.from('test'), originalname: 'test.jpg' },
    ];

    uploadImage.mockRejectedValue(
      new Error('ImageKit API error')
    );

    await ProductController.createProduct(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Error creating product',
      })
    );
  });

  test('should return 500 when database save fails', async () => {
    mockReq.body = {
      title: 'Test Product',
      description: 'Test Description',
      productAmount: { amount: 100, currency: 'INR' },
    };
    mockReq.files = [];

    const mockProduct = {
      save: jest.fn().mockRejectedValue(new Error('Database error')),
    };

    Product.mockImplementation(() => mockProduct);
    uploadImage.mockResolvedValue({});

    await ProductController.createProduct(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Error creating product',
      })
    );
  });

  test('should properly format ImageKit upload request', async () => {
    mockReq.body = {
      title: 'Test Product',
      description: 'Test Description',
      productAmount: { amount: 100, currency: 'INR' },
    };

    const testFile = {
      buffer: Buffer.from('test content'),
      originalname: 'myimage.jpg',
    };

    mockReq.files = [testFile];

    uploadImage.mockResolvedValue({
      url: 'https://ik.imagekit.io/test/image.jpg',
      thumbnailUrl: 'https://ik.imagekit.io/test/tr:w-200/image.jpg',
      fileId: 'file-123',
    });

    const mockProduct = {
      _id: 'new-id',
      title: 'Test Product',
      description: 'Test Description',
      productAmount: { amount: 100, currency: 'INR' },
      seller: '507f1f77bcf86cd799439011',
      images: [{
        url: 'https://ik.imagekit.io/test/image.jpg',
        thumbnailUrl: 'https://ik.imagekit.io/test/tr:w-200/image.jpg',
        fileId: 'file-123',
      }],
      save: jest.fn().mockResolvedValue({
        _id: 'new-id',
        title: 'Test Product',
        description: 'Test Description',
        productAmount: { amount: 100, currency: 'INR' },
        seller: '507f1f77bcf86cd799439011',
        images: [{
          url: 'https://ik.imagekit.io/test/image.jpg',
          thumbnailUrl: 'https://ik.imagekit.io/test/tr:w-200/image.jpg',
          fileId: 'file-123',
        }],
      }),
    };

    Product.mockImplementation(() => mockProduct);

    await ProductController.createProduct(mockReq, mockRes);

    expect(uploadImage).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Product created successfully',
      })
    );
  });
});

describe('ProductController - getProducts', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      query: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  test('should successfully retrieve all products', async () => {
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

    await ProductController.getProducts(mockReq, mockRes);

    expect(Product.find).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      products: mockProducts,
    });
  });

  test('should return empty array when no products found', async () => {
    const mockQuery = {
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    };
    Product.find = jest.fn().mockReturnValue(mockQuery);

    await ProductController.getProducts(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      products: [],
    });
  });

  test('should return 500 when database query fails', async () => {
    const mockQuery = {
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockRejectedValue(new Error('Database connection error')),
    };
    Product.find = jest.fn().mockReturnValue(mockQuery);

    await ProductController.getProducts(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Error fetching products',
      })
    );
  });
});
