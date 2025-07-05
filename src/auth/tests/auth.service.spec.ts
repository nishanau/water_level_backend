// Import necessary testing utilities from NestJS
import { Test, TestingModule } from '@nestjs/testing';
// Import the service we're testing
import { AuthService } from '../auth.service';
// Import dependencies that our service uses
import { UsersService } from '../../users/users.service';
import { SuppliersService } from '../../suppliers/suppliers.service';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Tank } from '../../models/tank.schema';
import { Order } from '../../models/order.schema';
import { Notification } from '../../models/notification.schema';
import { PaymentMethod } from '../../models/payment-method.schema';
// Import exceptions that we expect to be thrown in our tests
import { BadRequestException, ConflictException } from '@nestjs/common';
// Import DTOs used for registration
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { CreateSupplierDto } from '../../suppliers/dto/create-supplier.dto';
// Import bcrypt for password hashing
import * as bcrypt from 'bcrypt';

// Mock the nodemailer module completely to avoid sending real emails during tests
// The mock returns a transport object with a sendMail method that resolves to true
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue(true),
  }),
}));

// Main test suite for AuthService
describe('AuthService', () => {
  // Declare variables to hold our service and its dependencies
  // These will be initialized in beforeEach
  let service: AuthService;
  let usersService: UsersService;
  let suppliersService: SuppliersService;

  // Define mock data that will be used across multiple tests
  // This represents a customer user document as it would come from MongoDB
  const mockUser = {
    _id: 'user-id-1', // Simulated MongoDB document ID
    email: 'user@example.com', // User's email address
    role: 'customer', // Role type is customer
    emailVerificationToken: 'token123', // Token for email verification
    isEmailVerified: false, // User hasn't verified email yet
    save: jest.fn().mockResolvedValue(true), // Mock save method to avoid database writes
  };

  // Mock supplier document - similar to user but with company information
  const mockSupplier = {
    _id: 'supplier-id-1', // Simulated MongoDB document ID
    email: 'supplier@example.com', // Supplier's email address
    company: 'Test Company', // Company name (required for suppliers)
    role: 'supplier', // Role type is supplier
    emailVerificationToken: 'token456', // Token for email verification
    isEmailVerified: false, // Supplier hasn't verified email yet
    save: jest.fn().mockResolvedValue(true), // Mock save method to avoid database writes
  };

  // Create mock implementations of all service dependencies
  // This lets us control what these services return in tests
  const mockUsersService = {
    findByEmail: jest.fn(), // Mock method to find user by email
    create: jest.fn(), // Mock method to create a user
    findById: jest.fn(), // Mock method to find user by ID
    findPasswordById: jest.fn(), // Mock method to find user's password
    findbyIdWithPassword: jest.fn(), // Mock method to find user with password included
  };

  // Mock methods for supplier service - similar to user service
  const mockSuppliersService = {
    findByEmail: jest.fn(), // Mock method to find supplier by email
    create: jest.fn(), // Mock method to create a supplier
    findById: jest.fn(), // Mock method to find supplier by ID
  };

  // Mock JWT service for authentication tokens
  const mockJwtService = {
    signAsync: jest.fn(), // Mock method to sign JWT tokens
    verifyAsync: jest.fn(), // Mock method to verify JWT tokens
  };

  // Before each test, set up a fresh testing module
  beforeEach(async () => {
    // Reset all mocks before each test to ensure isolation
    // This prevents previous test calls from affecting current tests
    jest.clearAllMocks();

    // Create a NestJS testing module with all our dependencies mocked
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService, // The actual service we're testing
        // Replace real services with our mock implementations
        { provide: UsersService, useValue: mockUsersService },
        { provide: SuppliersService, useValue: mockSuppliersService },
        { provide: JwtService, useValue: mockJwtService },
        // Mock Mongoose models with minimal functionality needed for tests
        { provide: getModelToken(Tank.name), useValue: { find: jest.fn() } },
        { provide: getModelToken(Order.name), useValue: { find: jest.fn() } },
        {
          provide: getModelToken(Notification.name),
          useValue: { find: jest.fn() },
        },
        {
          provide: getModelToken(PaymentMethod.name),
          useValue: { find: jest.fn() },
        },
      ],
    }).compile();

    // Get instances of the services from the testing module
    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    suppliersService = module.get<SuppliersService>(SuppliersService);

    // Mock bcrypt methods to avoid actual password hashing during tests
    // This makes tests faster and more predictable
    jest.spyOn(bcrypt, 'genSalt').mockResolvedValue('salt' as never);
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed_password' as never);
  });

  // Basic test to ensure the service is properly initialized
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Test suite specifically for the registerUser method
  describe('registerUser', () => {
    // Define a valid user DTO that meets all requirements
    const validUserDto: CreateUserDto = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'password123', // Valid password (8+ characters)
      role: 'customer', // User role
      phoneNumber: '1234567890', // Optional phone number
    };

    // Test the happy path - successful user registration
    it('should successfully register a user', async () => {
      // Arrange: Set up the test conditions
      // No existing user or supplier with this email
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockSuppliersService.findByEmail.mockResolvedValue(null);
      // Mock the user creation to return a valid user
      mockUsersService.create.mockResolvedValue({
        ...mockUser,
        email: validUserDto.email, // Use the email from our test data
      });

      // Mock the email sending method to avoid actual emails
      jest.spyOn(service, 'sendVerificationEmail').mockResolvedValue(undefined);

      // Act: Call the method being tested
      const result = await service.registerUser(validUserDto);

      // Assert: Verify the results match expectations
      // Check that we got the expected success response
      expect(result).toEqual({
        success: true,
        message: 'Registration successful. Please verify your email.',
      });
      // Verify that service methods were called with correct parameters
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        validUserDto.email,
      );
      expect(mockSuppliersService.findByEmail).toHaveBeenCalledWith(
        validUserDto.email,
      );
      expect(mockUsersService.create).toHaveBeenCalledWith({
        ...validUserDto,
        password: 'hashed_password', // Verify password was hashed
      });
      // Verify email verification was attempted
      expect(service.sendVerificationEmail).toHaveBeenCalledWith(
        validUserDto.email,
        mockUser.emailVerificationToken,
      );
    });

    // Test case for invalid email format
    it('should throw BadRequestException for invalid email format', async () => {
      // Arrange: Create an invalid user with bad email format
      const invalidUserDto = { ...validUserDto, email: 'invalid-email' };

      // Act & Assert: Verify that the correct exception is thrown
      await expect(service.registerUser(invalidUserDto)).rejects.toThrow(
        BadRequestException,
      );
      // Verify that user creation was not attempted
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    // Test case for password that's too short
    it('should throw BadRequestException for short password', async () => {
      // Arrange: Create an invalid user with short password
      const invalidUserDto = { ...validUserDto, password: 'short' };

      // Act & Assert: Verify that the correct exception is thrown
      await expect(service.registerUser(invalidUserDto)).rejects.toThrow(
        BadRequestException,
      );
      // Verify that user creation was not attempted
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    // Test case for duplicate email (user already exists)
    it('should throw ConflictException if email already exists', async () => {
      // Arrange: Mock that a user with this email already exists
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      // Act & Assert: Verify that the correct exception is thrown
      await expect(service.registerUser(validUserDto)).rejects.toThrow(
        ConflictException,
      );
      // Verify that user creation was not attempted
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    // Test case for email that exists as a supplier
    it('should throw ConflictException if email exists as supplier', async () => {
      // Arrange: No user but a supplier with this email exists
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockSuppliersService.findByEmail.mockResolvedValue(mockSupplier);

      // Act & Assert: Verify that the correct exception is thrown
      await expect(service.registerUser(validUserDto)).rejects.toThrow(
        ConflictException,
      );
      // Verify that user creation was not attempted
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    // Test case for handling service errors
    it('should propagate service errors', async () => {
      // Arrange: No existing user, but creation will fail
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockSuppliersService.findByEmail.mockResolvedValue(null);
      // Mock database error during creation
      mockUsersService.create.mockRejectedValue(new Error('Database error'));

      // Act & Assert: Verify that the error is handled and wrapped
      await expect(service.registerUser(validUserDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // Test suite specifically for the registerSupplier method
  describe('registerSupplier', () => {
    // Define a valid supplier DTO with all required fields
    const validSupplierDto: CreateSupplierDto = {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'supplier@example.com',
      password: 'password123', // Valid password (8+ characters)
      role: 'supplier', // Supplier role
      company: 'Acme Corp', // Required for suppliers
      phoneNumber: '1234567890', // Optional phone number
    };

    // Test the happy path - successful supplier registration
    it('should successfully register a supplier', async () => {
      // Arrange: Set up the test conditions
      // No existing user or supplier with this email
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockSuppliersService.findByEmail.mockResolvedValue(null);
      // Mock the supplier creation to return a valid supplier
      mockSuppliersService.create.mockResolvedValue({
        ...mockSupplier,
        email: validSupplierDto.email, // Use the email from our test data
      });

      // Mock the email sending method to avoid actual emails
      jest.spyOn(service, 'sendVerificationEmail').mockResolvedValue(undefined);

      // Act: Call the method being tested
      const result = await service.registerSupplier(validSupplierDto);

      // Assert: Verify the results match expectations
      // Check that we got the expected success response
      expect(result).toEqual({
        success: true,
        message: 'Registration successful. Please verify your email.',
      });
      // Verify that service methods were called with correct parameters
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        validSupplierDto.email,
      );
      expect(mockSuppliersService.findByEmail).toHaveBeenCalledWith(
        validSupplierDto.email,
      );
      expect(mockSuppliersService.create).toHaveBeenCalledWith({
        ...validSupplierDto,
        password: 'hashed_password', // Verify password was hashed
      });
      // Verify email verification was attempted
      expect(service.sendVerificationEmail).toHaveBeenCalledWith(
        validSupplierDto.email,
        mockSupplier.emailVerificationToken,
      );
    });

    // Test case for missing company name (required for suppliers)
    it('should throw BadRequestException if company is missing', async () => {
      // Arrange: Create an invalid supplier with missing company
      const invalidSupplierDto = { ...validSupplierDto, company: '' };

      // Act & Assert: Verify that the correct exception is thrown
      await expect(
        service.registerSupplier(invalidSupplierDto),
      ).rejects.toThrow(BadRequestException);
      // Verify that supplier creation was not attempted
      expect(mockSuppliersService.create).not.toHaveBeenCalled();
    });

    // Test case for invalid email format
    it('should throw BadRequestException for invalid email format', async () => {
      // Arrange: Create an invalid supplier with bad email format
      const invalidSupplierDto = {
        ...validSupplierDto,
        email: 'invalid-email',
      };

      // Act & Assert: Verify that the correct exception is thrown
      await expect(
        service.registerSupplier(invalidSupplierDto),
      ).rejects.toThrow(BadRequestException);
      // Verify that supplier creation was not attempted
      expect(mockSuppliersService.create).not.toHaveBeenCalled();
    });

    // Test case for duplicate email (supplier already exists)
    it('should throw ConflictException if email already exists', async () => {
      // Arrange: No user but a supplier with this email exists
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockSuppliersService.findByEmail.mockResolvedValue(mockSupplier);

      // Act & Assert: Verify that the correct exception is thrown
      await expect(service.registerSupplier(validSupplierDto)).rejects.toThrow(
        ConflictException,
      );
      // Verify that supplier creation was not attempted
      expect(mockSuppliersService.create).not.toHaveBeenCalled();
    });
  });

  // Integration tests that test how private methods are used within public methods
  describe('Integration: Registration Process', () => {
    // Test how createUser is called during user registration
    it('should call createUser with correct parameters when registering a user', async () => {
      // Arrange: Setup test data and mocks
      const userDto: CreateUserDto = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'password123',
        role: 'customer',
        phoneNumber: '1234567890', // Add the required phoneNumber property
      };

      // Mock external service responses
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockSuppliersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({
        ...mockUser,
        email: userDto.email,
      });

      // Spy on the private method to verify it's called correctly
      // We use (service as any) to access private methods in tests
      const createUserSpy = jest.spyOn(service as any, 'createUser');
      jest.spyOn(service, 'sendVerificationEmail').mockResolvedValue(undefined);

      // Act: Call the public method
      await service.registerUser(userDto);

      // Assert: Verify the private method was called correctly
      expect(createUserSpy).toHaveBeenCalledWith(
        expect.objectContaining({ ...userDto, role: 'customer' }),
        'hashed_password',
      );
    });

    // Test how createSupplier is called during supplier registration
    it('should call createSupplier with correct parameters when registering a supplier', async () => {
      // Arrange: Setup test data and mocks
      const supplierDto: CreateSupplierDto = {
        firstName: 'Test',
        lastName: 'Supplier',
        email: 'supplier@example.com',
        password: 'password123',
        role: 'supplier',
        company: 'Test Company',
        phoneNumber: '1234567890', // Add the required phoneNumber property
      };

      // Mock external service responses
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockSuppliersService.findByEmail.mockResolvedValue(null);
      mockSuppliersService.create.mockResolvedValue({
        ...mockSupplier,
        email: supplierDto.email,
      });

      // Spy on the private method to verify it's called correctly
      const createSupplierSpy = jest.spyOn(service as any, 'createSupplier');
      jest.spyOn(service, 'sendVerificationEmail').mockResolvedValue(undefined);

      // Act: Call the public method
      await service.registerSupplier(supplierDto);

      // Assert: Verify the private method was called correctly
      expect(createSupplierSpy).toHaveBeenCalledWith(
        expect.objectContaining({ ...supplierDto, role: 'supplier' }),
        'hashed_password',
      );
    });
  });
});
