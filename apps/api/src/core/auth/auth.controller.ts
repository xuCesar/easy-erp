import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AccessTokenGuard } from './access-token.guard';
import { AuthService } from './auth.service';
import type {
  AuthPrincipal,
  AuthTokenResponse,
  LoginRequest,
  LogoutRequest,
  RefreshRequest,
} from './auth.types';

type AuthenticatedRequest = {
  user: AuthPrincipal;
};

type ApiSuccessResponse<T> = {
  code: 0;
  message: 'success';
  data: T;
  requestId: string;
};

function ok<T>(data: T): ApiSuccessResponse<T> {
  return {
    code: 0,
    message: 'success',
    data,
    requestId: randomUUID(),
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginRequest): Promise<ApiSuccessResponse<AuthTokenResponse>> {
    this.assertLoginRequest(body);

    return ok(await this.authService.login(body));
  }

  @Post('refresh')
  async refresh(
    @Body() body: RefreshRequest,
  ): Promise<ApiSuccessResponse<AuthTokenResponse>> {
    this.assertRefreshRequest(body);

    return ok(await this.authService.refresh(body));
  }

  @Post('logout')
  async logout(@Body() body: LogoutRequest): Promise<ApiSuccessResponse<null>> {
    this.assertRefreshRequest(body);
    await this.authService.logout(body);

    return ok(null);
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  async me(@Req() req: AuthenticatedRequest): Promise<ApiSuccessResponse<unknown>> {
    return ok(await this.authService.getCurrentUserProfile(req.user));
  }

  private assertLoginRequest(body: LoginRequest): void {
    if (
      !body ||
      typeof body.phone !== 'string' ||
      body.phone.trim().length === 0 ||
      typeof body.password !== 'string' ||
      body.password.length === 0
    ) {
      throw new BadRequestException('Invalid login request.');
    }
  }

  private assertRefreshRequest(body: RefreshRequest): void {
    if (
      !body ||
      typeof body.refreshToken !== 'string' ||
      body.refreshToken.trim().length === 0
    ) {
      throw new BadRequestException('Invalid refresh token request.');
    }
  }
}
