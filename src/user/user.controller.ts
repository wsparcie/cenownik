import { Role, User } from "@prisma/client";

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles/role.decorator";
import { RoleGuard } from "../auth/roles/role.guard";
import {
  DiscordWebhookResponseDto,
  SetDiscordWebhookDto,
} from "./dto/discord-webhook.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserResponseDto } from "./dto/user-response.dto";
import { UserService } from "./user.service";

@ApiTags("users")
@Controller("users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: "Get all users" })
  @ApiResponse({
    status: 200,
    description: "List of users retrieved successfully",
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth("access-token")
  async findAll(): Promise<UserResponseDto[]> {
    return this.userService.findAll();
  }

  @Get(":email")
  @ApiOperation({ summary: "Get user" })
  @ApiParam({ name: "email", description: "User email" })
  @ApiResponse({
    status: 200,
    description: "User retrieved successfully",
  })
  @UseGuards(AuthGuard)
  @ApiBearerAuth("access-token")
  @ApiResponse({
    status: 404,
    description: "User not found",
  })
  async findOne(@Param("email") email: string): Promise<User | null> {
    return this.userService.findOne(email);
  }

  @Patch(":email")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update user" })
  @ApiResponse({
    status: 200,
    description: "User updated successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Bad request",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden action",
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN, Role.USER)
  @ApiBearerAuth("access-token")
  async update(
    @Param("email") email: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() request: { user: { email: string; role: Role } },
  ): Promise<UserResponseDto> {
    return this.userService.update(email, updateUserDto, request.user);
  }

  @Delete(":email")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete user" })
  @ApiResponse({
    status: 204,
    description: "User deleted successfully",
  })
  @ApiResponse({
    status: 404,
    description: "User not found",
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth("access-token")
  async remove(@Param("email") email: string): Promise<void> {
    return this.userService.remove(email);
  }

  @Get("me/discord-webhook")
  @ApiOperation({ summary: "Get current user's Discord webhook status" })
  @ApiResponse({
    status: 200,
    description: "Discord webhook status retrieved successfully",
    type: DiscordWebhookResponseDto,
  })
  @UseGuards(AuthGuard)
  @ApiBearerAuth("access-token")
  async getDiscordWebhook(
    @Request() request: { user: { sub: number } },
  ): Promise<DiscordWebhookResponseDto> {
    const result = await this.userService.getDiscordWebhook(request.user.sub);
    return {
      success: true,
      message: result.hasWebhook
        ? "Discord webhook is configured"
        : "No Discord webhook configured",
      hasWebhook: result.hasWebhook,
      webhookUrl: result.webhookUrl,
    };
  }

  @Post("me/discord-webhook")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Set Discord webhook URL for notifications" })
  @ApiResponse({
    status: 200,
    description: "Discord webhook URL set successfully",
    type: DiscordWebhookResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid webhook URL format",
  })
  @UseGuards(AuthGuard)
  @ApiBearerAuth("access-token")
  async setDiscordWebhook(
    @Body() dto: SetDiscordWebhookDto,
    @Request() request: { user: { sub: number } },
  ): Promise<DiscordWebhookResponseDto> {
    const result = await this.userService.setDiscordWebhook(
      request.user.sub,
      dto.webhookUrl,
    );
    return {
      ...result,
      webhookUrl: dto.webhookUrl,
      hasWebhook: true,
    };
  }

  @Delete("me/discord-webhook")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Remove Discord webhook URL" })
  @ApiResponse({
    status: 200,
    description: "Discord webhook URL removed successfully",
    type: DiscordWebhookResponseDto,
  })
  @UseGuards(AuthGuard)
  @ApiBearerAuth("access-token")
  async removeDiscordWebhook(
    @Request() request: { user: { sub: number } },
  ): Promise<DiscordWebhookResponseDto> {
    const result = await this.userService.removeDiscordWebhook(
      request.user.sub,
    );
    return {
      ...result,
      hasWebhook: false,
      webhookUrl: null,
    };
  }
}
