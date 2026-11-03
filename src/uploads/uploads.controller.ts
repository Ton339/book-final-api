// src/uploads/uploads.controller.ts
import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { existsSync } from 'fs';
import { basename, join } from 'path';
import { UPLOAD_FOLDERS, UPLOAD_ROOT } from '../common/upload.util.js';

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  // GET /uploads/covers/xxx.jpg   หรือ   GET /uploads/reviews/xxx.png
  @Get(':folder/:filename')
  serve(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    // อนุญาตเฉพาะโฟลเดอร์ที่กำหนด กันเข้าถึงโฟลเดอร์อื่นในเครื่อง
    if (!(UPLOAD_FOLDERS as readonly string[]).includes(folder)) {
      throw new NotFoundException();
    }

    // basename() ตัด "../" ออก กัน path traversal
    const filePath = join(UPLOAD_ROOT, folder, basename(filename));
    if (!existsSync(filePath)) throw new NotFoundException('ไม่พบไฟล์');

    // sendFile ส่งไฟล์ดิบ และตั้ง Content-Type ตามนามสกุลให้เอง (image/jpeg, image/png ...)
    return res.sendFile(filePath);
  }
}

