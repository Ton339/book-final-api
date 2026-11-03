// src/books/books.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { ApiMultipart, createUploadOptions } from '../common/upload.util.js';
import { BooksService } from './books.service.js';
import { CreateBookDto } from './dto/create-book.dto.js';
import { UpdateBookDto } from './dto/update-book.dto.js';

// field ที่จะโชว์ในฟอร์มของ Swagger UI (ใช้ทดสอบเท่านั้น ไม่กระทบการทำงานจริง)
const BOOK_FIELDS = {
  title: { type: 'string' },
  author: { type: 'string' },
  tagIds: { type: 'array', items: { type: 'integer' } },
};

@ApiTags('books')
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Post()
  @ApiMultipart('cover', BOOK_FIELDS) // บอก Swagger ว่ารับ multipart + ช่องไฟล์ชื่อ cover
  // FileInterceptor('cover', ...) → รับไฟล์จาก field ชื่อ "cover" แล้วเซฟลง uploads/covers
  @UseInterceptors(FileInterceptor('cover', createUploadOptions('covers')))
  create(
    @Body() dto: CreateBookDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.booksService.create(dto, file);
  }

  @Get()
  findAll() {
    return this.booksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.findOne(id);
  }

  @Put(':id')
  @ApiMultipart('cover', BOOK_FIELDS)
  @UseInterceptors(FileInterceptor('cover', createUploadOptions('covers')))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBookDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.booksService.update(id, dto, file);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.remove(id);
  }
}

