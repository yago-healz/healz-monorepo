import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Request, Response } from "express";
import { SignupService } from "./signup.service";
import { SignupDto } from "./dto/signup.dto";

@Controller("signup")
export class SignupController {
  constructor(private signupService: SignupService) {}

  @Post()
  @HttpCode(201)
  @Throttle({ default: { ttl: 60000, limit: 3 } }) // 3 req/min
  async signup(
    @Body() signupDto: SignupDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.signupService.signup(signupDto, request.ip);

    // Armazenar refresh token em httpOnly cookie
    response.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    });

    return {
      accessToken: result.accessToken,
      user: result.user,
      organization: result.organization,
    };
  }
}
