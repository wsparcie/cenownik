import { Role, User } from "@prisma/client";
import { hash } from "bcrypt";

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { DatabaseService } from "../database/database.service";
import { RegisterDto } from "./dto/register.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserResponseDto, userToMetadata } from "./dto/user-response.dto";

@Injectable()
export class UserService {
  constructor(private database: DatabaseService) {}

  async create(registerDto: RegisterDto): Promise<UserResponseDto> {
    const hashedPassword = registerDto.password
      ? await hash(registerDto.password, 10)
      : undefined;

    const user = await this.database.user.create({
      data: {
        email: registerDto.email,
        password: hashedPassword,
        username: registerDto.username,
        role: Role.USER,
      },
    });
    return userToMetadata(user);
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.database.user.findMany();
    return users.map((user) => userToMetadata(user));
  }

  async findOne(email: string): Promise<User | null> {
    const user = await this.database.user.findUnique({
      where: { email },
    });
    if (user == null) {
      throw new NotFoundException(`User ${email} not found`);
    }
    return user;
  }

  async findOneMetadata(email: string): Promise<UserResponseDto> {
    const user = await this.database.user.findUnique({
      where: { email },
    });
    if (user == null) {
      throw new NotFoundException(`User ${email} not found`);
    }
    return userToMetadata(user);
  }

  async update(
    email: string,
    updateUserDto: UpdateUserDto,
    currentUser: { email: string; role: Role },
  ): Promise<UserResponseDto> {
    const existingUser = await this.database.user.findUnique({
      where: { email },
    });
    if (existingUser == null) {
      throw new NotFoundException(`User ${email} not found`);
    }
    const isAdmin = currentUser.role === Role.ADMIN;
    if (!isAdmin && currentUser.email !== email) {
      throw new ForbiddenException(
        "Admin rights required to update other users.",
      );
    }

    const updateData: {
      email?: string;
      password?: string;
      username?: string;
      role?: Role;
    } = {};

    if (updateUserDto.email !== undefined)
      updateData.email = updateUserDto.email;
    if (updateUserDto.username !== undefined)
      updateData.username = updateUserDto.username;
    if (updateUserDto.role !== undefined && isAdmin)
      updateData.role = updateUserDto.role;
    if (updateUserDto.password != null && updateUserDto.password !== "") {
      updateData.password = await hash(updateUserDto.password, 10);
    }

    const user = await this.database.user.update({
      where: { email },
      data: updateData,
    });
    return userToMetadata(user);
  }

  async remove(email: string): Promise<void> {
    const existingUser = await this.database.user.findUnique({
      where: { email },
    });
    if (existingUser === null) {
      throw new NotFoundException(`User ${email} not found`);
    }
    await this.database.user.delete({
      where: { email },
    });
  }
}
