// src/auth/auth.controller.ts
import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: any) {
    const { username, password } = body;

    const user = await this.authService.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException('Sai username hoặc password');
    }

    return this.authService.login(user);
  }
}
