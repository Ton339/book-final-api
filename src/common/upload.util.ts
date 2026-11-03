// src/common/upload.util.ts
import { BadRequestException, applyDecorators } from '@nestjs/common';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { existsSync, unlinkSync } from 'fs';
import { basename, extname, join } from 'path';

// โฟลเดอร์เก็บไฟล์จริง = <โปรเจกต์>/uploads  (อยู่นอก src จึงไม่โดน build ทับ)
export const UPLOAD_ROOT = join(process.cwd(), 'uploads');

// โฟลเดอร์ย่อยที่อนุญาต (ใช้ validate ใน uploads.controller ด้วย)
export const UPLOAD_FOLDERS = ['covers', 'reviews'] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

/**
 * สร้าง options ให้ FileInterceptor
 * ใช้: FileInterceptor('cover', createUploadOptions('covers'))
 */
export function createUploadOptions(folder: UploadFolder) {
  return {
    // diskStorage = เขียนไฟล์ลงดิสก์ (ไม่เก็บไว้ใน memory)
    storage: diskStorage({
      // destination เป็น string → multer สร้างโฟลเดอร์ให้เองถ้ายังไม่มี
      destination: join(UPLOAD_ROOT, folder),
      // ตั้งชื่อไฟล์ใหม่เอง กันชื่อซ้ำ/ชื่อภาษาไทย/อักขระแปลก
      filename: (
        _req: unknown,
        file: Express.Multer.File,
        cb: (error: Error | null, filename: string) => void,
      ) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${unique}${extname(file.originalname).toLowerCase()}`);
      },
    }),

    // จำกัดขนาดไฟล์ 2MB  (เกิน → Nest ตอบ 413 Payload Too Large ให้เอง)
    limits: { fileSize: 2 * 1024 * 1024 },

    // รับเฉพาะรูป jpg / png / webp
    fileFilter: (
      _req: unknown,
      file: Express.Multer.File,
      cb: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      if (!/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
        return cb(new BadRequestException('รองรับเฉพาะไฟล์ jpg, png, webp'), false);
      }
      cb(null, true);
    },
  };
}

/**
 * ตัวช่วยสำหรับ Swagger UI: บอกว่า endpoint รับ multipart/form-data และมีช่องเลือกไฟล์
 * ใช้ทดสอบผ่าน /docs เท่านั้น ไม่กระทบการทำงานจริง และไม่ต้องแก้อะไรใน DTO
 * ใช้: @ApiMultipart('cover', { title: { type: 'string' } })
 *      - อาร์กิวเมนต์ที่ 1 = ชื่อ field ไฟล์ (ต้องตรงกับ FileInterceptor)
 *      - อาร์กิวเมนต์ที่ 2 = field ข้อความอื่นๆ ที่อยากให้โชว์ในฟอร์ม
 */
export function ApiMultipart(fileField: string, fields: Record<string, any> = {}) {
  return applyDecorators(
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: { ...fields, [fileField]: { type: 'string', format: 'binary' } },
      },
    }),
  );
}

/** แปลงชื่อไฟล์เป็น URL ที่เก็บใน DB เช่น /uploads/covers/xxx.jpg */
export function buildFileUrl(folder: UploadFolder, filename: string) {
  return `/uploads/${folder}/${filename}`;
}

/**
 * ลบไฟล์จริงจากดิสก์ โดยรับ URL ที่เก็บใน DB (เช่น /uploads/covers/xxx.jpg)
 * รับ null/undefined ได้ (ไม่ทำอะไร) จะได้เรียกได้เลยไม่ต้องเช็คก่อน
 */
export function deleteUploadedFile(url?: string | null) {
  if (!url) return;
  const [, , folder, name] = url.split('/'); // ['', 'uploads', 'covers', 'xxx.jpg']
  if (!UPLOAD_FOLDERS.includes(folder as UploadFolder) || !name) return;
  // basename() กัน path traversal เช่น ../../etc/passwd
  const filePath = join(UPLOAD_ROOT, folder, basename(name));
  if (existsSync(filePath)) unlinkSync(filePath);
}

