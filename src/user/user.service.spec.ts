import { Role } from "@prisma/client";
import * as bcrypt from "bcrypt";

import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { DatabaseService } from "../database/database.service";
import type { RegisterDto } from "./dto/register.dto";
import type { UpdateUserDto } from "./dto/update-user.dto";
import { UserService } from "./user.service";

jest.mock("bcrypt");
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

const mockDatabaseService = {
  user: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe("UserService", () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a user", async () => {
      const registerDto: RegisterDto = {
        email: "uzytkownik@imejl.pl",
        username: "testowy_uzytkownik",
        password: "Haslo123!",
      };
      const hashedPassword = "zhashowaneHaslo123";
      mockBcrypt.hash.mockResolvedValue(hashedPassword as never);
      const expectedUser = {
        id: 1,
        email: "uzytkownik@imejl.pl",
        username: "testowy_uzytkownik",
        password: hashedPassword,
        role: Role.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDatabaseService.user.create.mockResolvedValue(expectedUser);
      const result = await service.create(registerDto);
      expect(mockBcrypt.hash).toHaveBeenCalledWith("Haslo123!", 10);
      expect(mockDatabaseService.user.create).toHaveBeenCalledWith({
        data: {
          email: "uzytkownik@imejl.pl",
          username: "testowy_uzytkownik",
          password: hashedPassword,
          role: Role.USER,
        },
      });
      expect(result).toEqual({
        id: 1,
        email: "uzytkownik@imejl.pl",
        username: "testowy_uzytkownik",
        role: Role.USER,
        createdAt: expectedUser.createdAt,
        updatedAt: expectedUser.updatedAt,
      });
    });

    it("should create a user without password", async () => {
      const registerDto: RegisterDto = {
        email: "uzytkownik@imejl.pl",
        username: "testowy_uzytkownik",
      };
      const expectedUser = {
        id: 1,
        email: "uzytkownik@imejl.pl",
        username: "testowy_uzytkownik",
        password: null,
        role: Role.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDatabaseService.user.create.mockResolvedValue(expectedUser);
      const result = await service.create(registerDto);
      expect(mockBcrypt.hash).not.toHaveBeenCalled();
      expect(mockDatabaseService.user.create).toHaveBeenCalledWith({
        data: {
          email: "uzytkownik@imejl.pl",
          username: "testowy_uzytkownik",
          password: undefined,
          role: Role.USER,
        },
      });
      expect(result).toHaveProperty("id", 1);
    });
  });

  describe("findAll", () => {
    it("should return all users", async () => {
      const expectedUsers = [
        {
          id: 1,
          email: "uzytkownik1@imejl.pl",
          username: "uzytkownik1",
          password: "zhashowaneHaslo",
          role: Role.USER,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          email: "uzytkownik2@imejl.pl",
          username: "uzytkownik2",
          password: "zhashowaneHaslo",
          role: Role.ADMIN,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockDatabaseService.user.findMany.mockResolvedValue(expectedUsers);
      const result = await service.findAll();
      expect(mockDatabaseService.user.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        email: "uzytkownik1@imejl.pl",
        username: "uzytkownik1",
        role: Role.USER,
        createdAt: expectedUsers[0].createdAt,
        updatedAt: expectedUsers[0].updatedAt,
      });
    });
  });

  describe("findOne", () => {
    it("should return a user by email", async () => {
      const expectedUser = {
        id: 1,
        email: "uzytkownik@imejl.pl",
        username: "testowy_uzytkownik",
        password: "zhashowaneHaslo",
        role: Role.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDatabaseService.user.findUnique.mockResolvedValue(expectedUser);
      const result = await service.findOne("uzytkownik@imejl.pl");
      expect(mockDatabaseService.user.findUnique).toHaveBeenCalledWith({
        where: { email: "uzytkownik@imejl.pl" },
      });
      expect(result).toEqual(expectedUser);
    });

    it("should throw NotFoundException when user not found", async () => {
      mockDatabaseService.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne("nieistnieje@imejl.pl")).rejects.toThrow(
        new NotFoundException("User nieistnieje@imejl.pl not found"),
      );
    });
  });

  describe("findOneMetadata", () => {
    it("should return user metadata by email", async () => {
      const expectedUser = {
        id: 1,
        email: "uzytkownik@imejl.pl",
        username: "testowy_uzytkownik",
        password: "zhashowaneHaslo",
        role: Role.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDatabaseService.user.findUnique.mockResolvedValue(expectedUser);
      const result = await service.findOneMetadata("uzytkownik@imejl.pl");
      expect(result).toEqual({
        id: 1,
        email: "uzytkownik@imejl.pl",
        username: "testowy_uzytkownik",
        role: Role.USER,
        createdAt: expectedUser.createdAt,
        updatedAt: expectedUser.updatedAt,
      });
    });

    it("should throw NotFoundException when user not found", async () => {
      mockDatabaseService.user.findUnique.mockResolvedValue(null);
      await expect(
        service.findOneMetadata("nieistnieje@imejl.pl"),
      ).rejects.toThrow(
        new NotFoundException("User nieistnieje@imejl.pl not found"),
      );
    });
  });

  describe("update", () => {
    const existingUser = {
      id: 1,
      email: "uzytkownik@imejl.pl",
      username: "testowy_uzytkownik",
      password: "stareZhashowanaHaslo",
      role: Role.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should allow user to update their own profile", async () => {
      const updateUserDto: UpdateUserDto = {
        username: "zaktualizowany_uzytkownik",
      };
      const currentUser = { email: "uzytkownik@imejl.pl", role: Role.USER };
      const updatedUser = {
        ...existingUser,
        username: updateUserDto.username ?? existingUser.username,
      };
      mockDatabaseService.user.findUnique.mockResolvedValue(existingUser);
      mockDatabaseService.user.update.mockResolvedValue(updatedUser);
      const result = await service.update(
        "uzytkownik@imejl.pl",
        updateUserDto,
        currentUser,
      );
      expect(mockDatabaseService.user.update).toHaveBeenCalledWith({
        where: { email: "uzytkownik@imejl.pl" },
        data: { username: "zaktualizowany_uzytkownik" },
      });
      expect(result.username).toBe("zaktualizowany_uzytkownik");
    });

    it("should allow admin to update any user", async () => {
      const updateUserDto: UpdateUserDto = {
        username: "zaktualizowany_admin",
      };
      const currentUser = { email: "admin@imejl.pl", role: Role.ADMIN };
      const updatedUser = {
        ...existingUser,
        username: updateUserDto.username ?? existingUser.username,
      };
      mockDatabaseService.user.findUnique.mockResolvedValue(existingUser);
      mockDatabaseService.user.update.mockResolvedValue(updatedUser);
      const result = await service.update(
        "uzytkownik@imejl.pl",
        updateUserDto,
        currentUser,
      );
      expect(result.username).toBe("zaktualizowany_admin");
    });

    it("should allow admin to update role", async () => {
      const updateUserDto: UpdateUserDto = {
        role: Role.ADMIN,
      };
      const currentUser = { email: "admin@imejl.pl", role: Role.ADMIN };
      const updatedUser = {
        ...existingUser,
        role: Role.ADMIN,
      };
      mockDatabaseService.user.findUnique.mockResolvedValue(existingUser);
      mockDatabaseService.user.update.mockResolvedValue(updatedUser);
      const result = await service.update(
        "uzytkownik@imejl.pl",
        updateUserDto,
        currentUser,
      );
      expect(mockDatabaseService.user.update).toHaveBeenCalledWith({
        where: { email: "uzytkownik@imejl.pl" },
        data: { role: Role.ADMIN },
      });
      expect(result.role).toBe(Role.ADMIN);
    });

    it("should hash password when updating", async () => {
      const updateUserDto: UpdateUserDto = {
        password: "noweHaslo123!",
      };
      const currentUser = { email: "uzytkownik@imejl.pl", role: Role.USER };
      const hashedPassword = "noweZhashowaneHaslo";
      mockBcrypt.hash.mockResolvedValue(hashedPassword as never);
      mockDatabaseService.user.findUnique.mockResolvedValue(existingUser);
      mockDatabaseService.user.update.mockResolvedValue({
        ...existingUser,
        password: hashedPassword,
      });
      await service.update("uzytkownik@imejl.pl", updateUserDto, currentUser);
      expect(mockBcrypt.hash).toHaveBeenCalledWith("noweHaslo123!", 10);
      expect(mockDatabaseService.user.update).toHaveBeenCalledWith({
        where: { email: "uzytkownik@imejl.pl" },
        data: { password: hashedPassword },
      });
    });

    it("should throw ForbiddenException when non-admin tries to update other user", async () => {
      const updateUserDto: UpdateUserDto = {
        username: "updated",
      };
      const currentUser = { email: "inny@imejl.pl", role: Role.USER };
      mockDatabaseService.user.findUnique.mockResolvedValue(existingUser);
      await expect(
        service.update("uzytkownik@imejl.pl", updateUserDto, currentUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw NotFoundException when user to update does not exist", async () => {
      const updateUserDto: UpdateUserDto = {
        username: "updated",
      };
      const currentUser = {
        email: "nieistnieje@imejl.pl",
        role: Role.USER,
      };
      mockDatabaseService.user.findUnique.mockResolvedValue(null);
      await expect(
        service.update("nieistnieje@imejl.pl", updateUserDto, currentUser),
      ).rejects.toThrow(
        new NotFoundException("User nieistnieje@imejl.pl not found"),
      );
    });
  });

  describe("remove", () => {
    it("should delete a user", async () => {
      const existingUser = {
        id: 1,
        email: "uzytkownik@imejl.pl",
        username: "testowy_uzytkownik",
        password: "zhashowaneHaslo",
        role: Role.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDatabaseService.user.findUnique.mockResolvedValue(existingUser);
      mockDatabaseService.user.delete.mockResolvedValue(existingUser);
      await service.remove("uzytkownik@imejl.pl");
      expect(mockDatabaseService.user.delete).toHaveBeenCalledWith({
        where: { email: "uzytkownik@imejl.pl" },
      });
    });

    it("should throw NotFoundException when user does not exist", async () => {
      mockDatabaseService.user.findUnique.mockResolvedValue(null);
      await expect(service.remove("nieistnieje@imejl.pl")).rejects.toThrow(
        new NotFoundException("User nieistnieje@imejl.pl not found"),
      );
    });
  });
});
