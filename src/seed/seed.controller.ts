// src/seed/seed.controller.ts
import { Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SeedService } from './seed.service.js';

@ApiTags('seed')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post()
  @ApiOperation({ summary: 'สร้างข้อมูลจำลอง (Seed Database) ผ่าน POST' })
  runSeedPost() {
    return this.seedService.run();
  }

  @Get()
  @ApiOperation({ summary: 'สร้างข้อมูลจำลอง (Seed Database) ผ่าน GET สะดวกต่อการเปิดผ่านเบราว์เซอร์' })
  runSeedGet() {
    return this.seedService.run();
  }
}

