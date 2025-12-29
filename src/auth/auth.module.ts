import { Module, forwardRef } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { DatabaseModule } from "../database/database.module";
import { UserModule } from "../user/user.module";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { RoleGuard } from "./roles/role.guard";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AuthGuard, RoleGuard],
  imports: [
    forwardRef(() => DatabaseModule),
    forwardRef(() => UserModule),
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? "cenownik-jwt-secret",
      signOptions: { expiresIn: "7d" },
    }),
  ],
  exports: [AuthService, AuthGuard, RoleGuard],
})
export class AuthModule {}
