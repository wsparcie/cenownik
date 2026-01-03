import * as bcrypt from "bcrypt";

import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { UserService } from "../user/user.service";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  let service: AuthService;
  let hashedValidPassword: string;
  let hashedCorrectPassword: string;

  const mockUser = {
    id: 1,
    email: "test@example.com",
    username: "testuser",
    password: "$2b$10$hashedpassword",
    role: "USER" as const,
    discordWebhookUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserService = {
    findOne: jest.fn(),
    findOneMetadata: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue("mock-jwt-token"),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    hashedValidPassword = await bcrypt.hash("ValidPassword123!", 10);
    hashedCorrectPassword = await bcrypt.hash("CorrectPassword123!", 10);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("signIn", () => {
    it("should return token for valid credentials", async () => {
      mockUserService.findOne.mockResolvedValue({
        ...mockUser,
        password: hashedValidPassword,
      });

      const result = await service.signIn(
        "test@example.com",
        "ValidPassword123!",
      );

      expect(result).toHaveProperty("token");
      expect(result.token).toBe("mock-jwt-token");
      expect(mockUserService.findOne).toHaveBeenCalledWith("test@example.com");
      expect(mockJwtService.sign).toHaveBeenCalled();
    });

    it("should throw UnauthorizedException for non-existent user", async () => {
      mockUserService.findOne.mockResolvedValue(null);

      await expect(
        service.signIn("nonexistent@example.com", "password"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException for wrong password", async () => {
      mockUserService.findOne.mockResolvedValue({
        ...mockUser,
        password: hashedCorrectPassword,
      });

      await expect(
        service.signIn("test@example.com", "WrongPassword123!"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException for user without password", async () => {
      mockUserService.findOne.mockResolvedValue({
        ...mockUser,
        password: null,
      });

      await expect(
        service.signIn("test@example.com", "AnyPassword123!"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException for empty password in DB", async () => {
      mockUserService.findOne.mockResolvedValue({
        ...mockUser,
        password: "",
      });

      await expect(
        service.signIn("test@example.com", "AnyPassword123!"),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("signUp", () => {
    it("should create user and return token", async () => {
      mockUserService.findOne.mockRejectedValue(new Error("Not found"));
      mockUserService.create.mockResolvedValue(mockUser);

      const result = await service.signUp(
        "new@example.com",
        "NewPassword123!",
        "newuser",
      );

      expect(result).toHaveProperty("token");
      expect(result.token).toBe("mock-jwt-token");
      expect(mockUserService.create).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "NewPassword123!",
        username: "newuser",
      });
    });

    it("should throw ConflictException if user already exists", async () => {
      mockUserService.findOne.mockResolvedValue(mockUser);

      await expect(
        service.signUp("test@example.com", "Password123!", "testuser"),
      ).rejects.toThrow(ConflictException);
    });

    it("should create user without username", async () => {
      mockUserService.findOne.mockRejectedValue(new Error("Not found"));
      mockUserService.create.mockResolvedValue({
        ...mockUser,
        username: null,
      });

      const result = await service.signUp("new@example.com", "NewPassword123!");

      expect(result).toHaveProperty("token");
      expect(mockUserService.create).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "NewPassword123!",
        username: undefined,
      });
    });
  });

  describe("validateToken", () => {
    it("should return user data for valid token payload", async () => {
      const userMetadata = {
        id: 1,
        email: "test@example.com",
        username: "testuser",
        role: "USER",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockUserService.findOneMetadata.mockResolvedValue(userMetadata);

      const result = await service.validateToken({
        email: "test@example.com",
        sub: "test@example.com",
      });

      expect(result).toEqual(userMetadata);
      expect(mockUserService.findOneMetadata).toHaveBeenCalledWith(
        "test@example.com",
      );
    });

    it("should throw UnauthorizedException for invalid token", async () => {
      mockUserService.findOneMetadata.mockRejectedValue(
        new Error("User not found"),
      );

      await expect(
        service.validateToken({
          email: "nonexistent@example.com",
          sub: "nonexistent@example.com",
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
