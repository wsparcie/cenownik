import { compare } from "bcrypt";

import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import { RegisterDto } from "../user/dto/register.dto";
import { UserResponseDto } from "../user/dto/user-response.dto";
import { UserService } from "../user/user.service";
import { ResponseDto } from "./dto/response.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  private async generateToken(email: string): Promise<string> {
    const user = await this.userService.findOne(email);
    if (user === null) {
      throw new UnauthorizedException("User not found");
    }
    const payload = { email, sub: email, role: user.role };
    return this.jwtService.sign(payload);
  }

  async validateToken(payload: {
    email: string;
    sub: string;
  }): Promise<UserResponseDto> {
    try {
      const userResponseDto = await this.userService.findOneMetadata(
        payload.email,
      );
      return userResponseDto;
    } catch {
      throw new UnauthorizedException("Invalid token: user not found");
    }
  }

  async signIn(email: string, password: string): Promise<ResponseDto> {
    const user = await this.userService.findOne(email);
    if (user === null) {
      throw new UnauthorizedException();
    }
    let passwordMatches: boolean;
    try {
      passwordMatches =
        user.password !== null && user.password !== ""
          ? await compare(password, user.password)
          : false;
    } catch {
      passwordMatches = false;
    }
    if (!passwordMatches) {
      throw new UnauthorizedException();
    }
    const token = await this.generateToken(user.email);
    return { token };
  }

  async signUp(
    email: string,
    password: string,
    username?: string,
  ): Promise<ResponseDto> {
    try {
      const existingUser = await this.userService.findOne(email);
      if (existingUser !== null) {
        throw new ConflictException("User with this email exists");
      }
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
    }

    const registerDto: RegisterDto = {
      email,
      password,
      username,
    };
    const user = await this.userService.create(registerDto);
    const payload = { email: user.email, sub: user.email, role: user.role };
    const token = this.jwtService.sign(payload);
    return { token };
  }
}
