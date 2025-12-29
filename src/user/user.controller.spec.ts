import { Role } from "@prisma/client";

import { Reflector } from "@nestjs/core";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { AuthGuard } from "../auth/auth.guard";
import { RoleGuard } from "../auth/roles/role.guard";
import type { UpdateUserDto } from "./dto/update-user.dto";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";

const mockUserService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const mockAuthGuard = {
  canActivate: jest.fn(() => true),
};

const mockRoleGuard = {
  canActivate: jest.fn(() => true),
};

describe("UserController", () => {
  let controller: UserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(RoleGuard)
      .useValue(mockRoleGuard)
      .compile();
    controller = module.get<UserController>(UserController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("findAll", () => {
    it("should call service findAll method", async () => {
      const mockResult = [
        {
          id: 1,
          email: "test@example.com",
          username: "test",
          role: Role.USER,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockUserService.findAll.mockResolvedValue(mockResult);
      const result = await controller.findAll();
      expect(mockUserService.findAll).toHaveBeenCalledWith();
      expect(result).toBe(mockResult);
    });
  });

  describe("findOne", () => {
    it("should call service findOne method", async () => {
      const mockResult = {
        id: 1,
        email: "test@example.com",
        username: "test",
        password: "hashedPassword",
        role: Role.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockUserService.findOne.mockResolvedValue(mockResult);
      const result = await controller.findOne("test@example.com");
      expect(mockUserService.findOne).toHaveBeenCalledWith("test@example.com");
      expect(result).toBe(mockResult);
    });
  });

  describe("update", () => {
    it("should call service update method", async () => {
      const updateUserDto: UpdateUserDto = {
        username: "zaktualizowany_uzytkownik",
      };
      const request = {
        user: {
          email: "uzytkownik@imejl.pl",
          role: Role.USER,
        },
      };
      const mockResult = {
        id: 1,
        email: "uzytkownik@imejl.pl",
        username: "zaktualizowany_uzytkownik",
        role: Role.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockUserService.update.mockResolvedValue(mockResult);
      const result = await controller.update(
        "uzytkownik@imejl.pl",
        updateUserDto,
        request,
      );
      expect(mockUserService.update).toHaveBeenCalledWith(
        "uzytkownik@imejl.pl",
        updateUserDto,
        request.user,
      );
      expect(result).toBe(mockResult);
    });
  });

  describe("remove", () => {
    it("should call service remove method", async () => {
      mockUserService.remove.mockResolvedValue(undefined);
      await controller.remove("uzytkownik@imejl.pl");
      expect(mockUserService.remove).toHaveBeenCalledWith(
        "uzytkownik@imejl.pl",
      );
    });
  });
});
