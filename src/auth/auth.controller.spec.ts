import { UnauthorizedException } from "@nestjs/common";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

describe("AuthController", () => {
  let controller: AuthController;

  const mockAuthService = {
    signIn: jest.fn(),
    signUp: jest.fn(),
    validateToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("signIn", () => {
    it("should return token for valid login", async () => {
      const mockToken = { token: "jwt-token" };
      mockAuthService.signIn.mockResolvedValue(mockToken);

      const result = await controller.signIn({
        email: "test@example.com",
        password: "ValidPassword123!",
      });

      expect(result).toEqual(mockToken);
      expect(mockAuthService.signIn).toHaveBeenCalledWith(
        "test@example.com",
        "ValidPassword123!",
      );
    });

    it("should propagate UnauthorizedException", async () => {
      mockAuthService.signIn.mockRejectedValue(new UnauthorizedException());

      await expect(
        controller.signIn({
          email: "test@example.com",
          password: "WrongPassword123!",
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("signUp", () => {
    it("should create user and return token", async () => {
      const mockToken = { token: "jwt-token" };
      mockAuthService.signUp.mockResolvedValue(mockToken);

      const result = await controller.signUp({
        email: "new@example.com",
        password: "NewPassword123!",
        username: "newuser",
      });

      expect(result).toEqual(mockToken);
      expect(mockAuthService.signUp).toHaveBeenCalledWith(
        "new@example.com",
        "NewPassword123!",
        "newuser",
      );
    });

    it("should create user without password (OAuth)", async () => {
      const mockToken = { token: "jwt-token" };
      mockAuthService.signUp.mockResolvedValue(mockToken);

      const result = await controller.signUp({
        email: "oauth@example.com",
        username: "oauthuser",
      });

      expect(result).toEqual(mockToken);
      expect(mockAuthService.signUp).toHaveBeenCalledWith(
        "oauth@example.com",
        "",
        "oauthuser",
      );
    });
  });

  describe("getCurrentUser", () => {
    it("should return current user data", async () => {
      const mockUser = {
        id: 1,
        email: "test@example.com",
        username: "testuser",
        role: "USER",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockAuthService.validateToken.mockResolvedValue(mockUser);

      const mockRequest = {
        user: { email: "test@example.com" },
      } as Parameters<typeof controller.getCurrentUser>[0];

      const result = await controller.getCurrentUser(mockRequest);

      expect(result).toEqual(mockUser);
      expect(mockAuthService.validateToken).toHaveBeenCalledWith({
        email: "test@example.com",
        sub: "test@example.com",
      });
    });

    it("should propagate UnauthorizedException for invalid token", async () => {
      mockAuthService.validateToken.mockRejectedValue(
        new UnauthorizedException(),
      );

      const mockRequest = {
        user: { email: "invalid@example.com" },
      } as Parameters<typeof controller.getCurrentUser>[0];

      await expect(controller.getCurrentUser(mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
