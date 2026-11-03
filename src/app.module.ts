// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BooksModule } from './books/books.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { TagsModule } from './tags/tags.module.js';
import { UploadsModule } from './uploads/uploads.module.js';
import { SeedModule } from './seed/seed.module.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'dev.db', // ไฟล์ฐานข้อมูล สร้างที่รากโปรเจกต์ backend
      autoLoadEntities: true, // entity ที่ลงทะเบียนผ่าน forFeature() ในแต่ละ module จะถูกโหลดให้เอง
      synchronize: true, // สร้าง/แก้ตารางตาม entity อัตโนมัติ (ใช้เฉพาะ dev เท่านั้น!)
    }),
    BooksModule,
    ReviewsModule,
    TagsModule,
    UploadsModule,
    SeedModule,
  ],
})
export class AppModule {}
