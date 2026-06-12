import { Controller, Get, Post, Body, Param, Query, Headers } from '@nestjs/common';
import { ClaimsService } from './claims.service';

@Controller()
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Get('/health')
  async health() {
    return this.claimsService.health();
  }

  @Post('/api/claims')
  async createClaim(
    @Body() body: any,
    @Headers('authorization') auth: string,
  ) {
    // Extract user from JWT (stubbed for demo)
    const userId = this.extractUserId(auth);
    
    return this.claimsService.createClaim(body, userId);
  }

  @Get('/api/claims/:id')
  async getClaim(@Param('id') id: string) {
    return this.claimsService.getClaim(id);
  }

  @Get('/api/claims')
  async listClaims(@Query() query: any) {
    return this.claimsService.listClaims(query);
  }

  private extractUserId(authHeader: string): string {
    // Stub: In production, verify JWT and extract sub claim
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return 'anonymous';
    }
    
    // For demo, just return a mock user ID
    return 'user-441';
  }
}

// Made with Bob
