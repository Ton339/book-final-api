// src/reviews/reviews.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiMultipart, createUploadOptions } from '../common/upload.util.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';
import { ReviewsService } from './reviews.service.js';

// field ที่จะโชว์ในฟอร์มของ Swagger UI (ใช้ทดสอบเท่านั้น)
const REVIEW_FIELDS = {
  rating: { type: 'integer', minimum: 1, maximum: 5 },
  content: { type: 'string' },
};

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiMultipart('image', { bookId: { type: 'integer' }, ...REVIEW_FIELDS }) // ตอนสร้างต้องส่ง bookId
  // รับไฟล์จาก field ชื่อ "image" เซฟลง uploads/reviews
  @UseInterceptors(FileInterceptor('image', createUploadOptions('reviews')))
  create(@Body() dto: CreateReviewDto, @UploadedFile() file?: Express.Multer.File) {
    return this.reviewsService.create(dto, file);
  }

  @Get()
  @ApiQuery({ name: 'bookId', required: false, type: Number })
  findAll(
    // optional: true = ไม่ส่ง ?bookId มาก็ได้ (ได้รีวิวทั้งหมด)
    @Query('bookId', new ParseIntPipe({ optional: true })) bookId?: number,
  ) {
    return this.reviewsService.findAll(bookId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.findOne(id);
  }

  @Put(':id')
  @ApiMultipart('image', REVIEW_FIELDS) // ตอนแก้ไม่ส่ง bookId
  @UseInterceptors(FileInterceptor('image', createUploadOptions('reviews')))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReviewDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.reviewsService.update(id, dto, file);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.remove(id);
  }
}

