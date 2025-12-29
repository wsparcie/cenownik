import type { Request } from "express";

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { RegisterDto } from "../user/dto/register.dto";
import { UserResponseDto } from "../user/dto/user-response.dto";
import { AuthGuard as JwtAuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { ResponseDto } from "./dto/response.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Log in with an existing account",
  })
  @ApiResponse({
    status: 200,
    description: "Logged in successfully",
  })
  @ApiResponse({
    status: 401,
    description: "Invalid credentials or account deactivated",
  })
  async signIn(@Body() loginDto: LoginDto): Promise<ResponseDto> {
    return this.authService.signIn(loginDto.email, loginDto.password);
  }

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create a new account",
  })
  @ApiResponse({
    status: 201,
    description: "Account created successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid data or validation failed",
  })
  @ApiResponse({
    status: 409,
    description: "Account already exists",
  })
  async signUp(@Body() registerDto: RegisterDto): Promise<ResponseDto> {
    return this.authService.signUp(
      registerDto.email,
      registerDto.password ?? "",
      registerDto.username,
    );
  }

  @Get("me")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("access-token")
  @ApiOperation({
    summary: "Get current user information",
  })
  @ApiResponse({
    status: 200,
    description: "User information retrieved successfully",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - invalid or missing token",
  })
  async getCurrentUser(
    @Req() request: Request & { user: { email: string } },
  ): Promise<UserResponseDto> {
    return this.authService.validateToken({
      email: request.user.email,
      sub: request.user.email,
    });
  }
}
