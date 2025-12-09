import { Controller, Post, UseGuards, Request, Body } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LocalAuthGuard } from "./guards/local-auth.guard";
import { JwtRefreshGuard } from "./guards/jwt-refresh.guard";
import { Throttle } from "@nestjs/throttler";
import { RegisterDto } from "./dto/register.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ short: { limit: 3, ttl: 1000 } })
  @Post("register")
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Throttle({ short: { limit: 2, ttl: 1000 } })
  @UseGuards(LocalAuthGuard)
  @Post("login")
  async login(@Request() req: { user: any }) {
    return this.authService.login(req.user);
  }

  @Throttle({ short: { limit: 2, ttl: 1000 } })
  @UseGuards(JwtRefreshGuard)
  @Post("refresh")
  async refresh(@Request() req: { user: any }) {
    return this.authService.refreshToken(req.user);
  }
}
