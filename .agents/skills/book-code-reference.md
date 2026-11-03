# 📚 Book Final API — Code Reference & Developer Guide

> NestJS + TypeORM + better-sqlite3 + Multer  
> Port **3001** | Swagger UI: **http://localhost:3001/docs**

---

## สารบัญ

- [1. โครงสร้างโปรเจค](#1-โครงสร้างโปรเจค)
- [2. คำสั่งที่ใช้บ่อย (Common Commands)](#2-คำสั่งที่ใช้บ่อย)
- [3. Flow Diagrams](#3-flow-diagrams)
  - [3.1 Request Lifecycle](#31-request-lifecycle)
  - [3.2 File Upload Flow](#32-file-upload-flow)
  - [3.3 File Delete Flow](#33-file-delete-flow)
  - [3.4 Seed Flow](#34-seed-flow)
- [4. Module อธิบาย](#4-module-อธิบาย)
  - [4.1 common/upload.util.ts](#41-commonuploadutilts)
  - [4.2 Tags Module](#42-tags-module)
  - [4.3 Books Module](#43-books-module)
  - [4.4 Reviews Module](#44-reviews-module)
  - [4.5 Uploads Module](#45-uploads-module)
  - [4.6 Seed Module](#46-seed-module)
- [5. Full Code Snippets](#5-full-code-snippets)
- [6. cURL Examples](#6-curl-examples)
- [7. Gotchas & Tips](#7-gotchas--tips)

---

## 1. โครงสร้างโปรเจค

```
book-final-api/
├── src/
│   ├── main.ts                    ← Entry point: CORS, Pipe, Swagger, listen
│   ├── app.module.ts              ← Root module: TypeORM + import ทุก module
│   ├── seed.ts                    ← CLI entry point สำหรับ `npm run seed`
│   │
│   ├── common/
│   │   └── upload.util.ts         ← Multer config, buildFileUrl, deleteUploadedFile
│   │
│   ├── tags/
│   │   ├── entities/tag.entity.ts ← DB table: id, name, books[]
│   │   ├── dto/create-tag.dto.ts  ← Validation: name (string, max 50)
│   │   ├── dto/update-tag.dto.ts  ← PartialType(CreateTagDto)
│   │   ├── tags.service.ts        ← CRUD + ป้องกัน duplicate + ป้องกัน delete ที่มี book
│   │   ├── tags.controller.ts     ← GET/POST/PUT/DELETE /tags
│   │   └── tags.module.ts
│   │
│   ├── books/
│   │   ├── entities/book.entity.ts ← DB table: id, title, author, coverUrl, publishedAt, tags[], reviews[]
│   │   ├── dto/create-book.dto.ts  ← Validation: title, author, tagIds[] (multipart-aware)
│   │   ├── dto/update-book.dto.ts  ← PartialType(CreateBookDto)
│   │   ├── books.service.ts        ← CRUD + file management + tag loading
│   │   ├── books.controller.ts     ← GET/POST/PUT/DELETE /books + FileInterceptor
│   │   └── books.module.ts
│   │
│   ├── reviews/
│   │   ├── entities/review.entity.ts ← DB table: id, rating, content, imageUrl, bookId
│   │   ├── dto/create-review.dto.ts  ← Validation: bookId, rating(1-5), content
│   │   ├── dto/update-review.dto.ts  ← PartialType(CreateReviewDto)
│   │   ├── reviews.service.ts        ← CRUD + file management
│   │   ├── reviews.controller.ts     ← GET/POST/PUT/DELETE /reviews + ?bookId filter
│   │   └── reviews.module.ts
│   │
│   ├── uploads/
│   │   ├── uploads.controller.ts  ← GET /uploads/:folder/:filename → sendFile
│   │   └── uploads.module.ts
│   │
│   └── seed/
│       ├── seed.service.ts        ← SeedService.run(): clear → tags → books → reviews
│       ├── seed.controller.ts     ← GET /seed และ POST /seed
│       └── seed.module.ts
│
├── uploads/                       ← ไฟล์รูปภาพที่ upload (สร้างอัตโนมัติ)
│   ├── covers/                    ← ปกหนังสือ
│   └── reviews/                   ← รูปประกอบรีวิว
│
├── dev.db                         ← SQLite database (สร้างอัตโนมัติ)
├── package.json
├── nest-cli.json
└── .env                           ← PORT=3001
```

---

## 2. คำสั่งที่ใช้บ่อย

### 🚀 รันโปรเจค

```bash
# รัน dev server (hot reload / watch mode) — ใช้ตอนพัฒนา
npm run start:dev

# Build TypeScript → dist/
npm run build

# รัน production build (ต้อง build ก่อน)
npm run start:prod
```

### 🌱 Seed ฐานข้อมูล

```bash
# Seed ผ่าน CLI (build + รัน src/seed.ts)
npm run seed

# Seed ผ่าน browser (GET)
# http://localhost:3001/seed

# Seed ผ่าน Swagger UI (POST)
# http://localhost:3001/docs → /seed → Try it out
```

### 🧪 Test

```bash
npm run test           # รัน unit tests ทั้งหมด (vitest)
npm run test:watch     # watch mode
npm run test:cov       # coverage report
npm run test:e2e       # end-to-end tests
```

### 🛠️ อื่น ๆ

```bash
npm run format         # prettier format
npm run lint           # oxlint
```

> [!IMPORTANT]
> บน **Windows PowerShell** ต้องใช้ prefix `cmd /c "npm ..."` หากติดปัญหา execution policy
> ```powershell
> cmd /c "npm run start:dev"
> ```

---

## 3. Flow Diagrams

### 3.1 Request Lifecycle

```
HTTP Request
     │
     ▼
main.ts (bootstrap)
     │  ├─ CORS: origin = http://localhost:3000
     │  ├─ ValidationPipe (whitelist, transform)
     │  └─ SwaggerModule @ /docs
     │
     ▼
AppModule → Router
     │
     ├─ /tags      → TagsController   → TagsService   → Repository<Tag>
     ├─ /books     → BooksController  → BooksService  → Repository<Book>
     ├─ /reviews   → ReviewsController→ ReviewsService→ Repository<Review>
     ├─ /uploads   → UploadsController (sendFile โดยตรง)
     └─ /seed      → SeedController   → SeedService
                                              │
                                              ▼
                                        TypeORM ↔ better-sqlite3 (dev.db)
```

### 3.2 File Upload Flow

```
POST /books  (multipart/form-data)
     │
     ▼
FileInterceptor('cover', createUploadOptions('covers'))
     │  ├─ fileFilter: ตรวจ mimetype (jpeg|png|webp), ถ้าไม่ผ่าน → 400
     │  ├─ limits: 2MB max
     │  └─ diskStorage: บันทึกไฟล์ → uploads/covers/<timestamp>-<random>.ext
     │
     ▼
BooksController.create(@Body() dto, @UploadedFile() file)
     │
     ▼
BooksService.create(dto, file)
     │  ├─ buildFileUrl('covers', file.filename)
     │  │    → '/uploads/covers/1234567890-987654321.jpg'
     │  ├─ loadTags(tagIds)   ← ตรวจ id ทุกตัวมีจริง
     │  ├─ repo.save(...)     ← บันทึก DB พร้อม coverUrl
     │  └─ [error] deleteUploadedFile(coverUrl) ← rollback ไฟล์
     │
     ▼
Response: Book JSON (พร้อม coverUrl)
```

### 3.3 File Delete Flow

```
DELETE /books/:id
     │
     ▼
BooksService.remove(id)
     │  ├─ findOne(id)  ← load book + reviews (relations)
     │  ├─ รวม URL ไฟล์:
     │  │    files = [book.coverUrl, ...book.reviews.map(r => r.imageUrl)]
     │  ├─ repo.delete(id)
     │  │    DB: Review rows ถูกลบ (onDelete CASCADE)
     │  │    DB: book_tags_tag rows ถูกลบ (JoinTable)
     │  │    DB: Book row ถูกลบ
     │  └─ files.forEach(url => deleteUploadedFile(url))
     │       ← ลบไฟล์จริงบน disk ทีละไฟล์
     │
     ▼
Response: { deleted: true }
```

### 3.4 Seed Flow

```
GET /seed  หรือ  POST /seed  หรือ  npm run seed
     │
     ▼
SeedService.run()
     │
     ├─ 1. Clear Tables (ลำดับสำคัญ: Review → Book → Tag)
     │       เหตุ: FK Review.bookId → Book.id
     │
     ├─ 2. Create Tags (6 tags)
     │       Programming, Clean Architecture, Web Development,
     │       Database, UX/UI Design, Classic
     │
     ├─ 3. Create Books (4 books พร้อม seed PNG)
     │       book1: Clean Code       ← tags: Programming, Clean Architecture, Classic
     │       book2: Pragmatic Prog.  ← tags: Programming, Classic
     │       book3: DDIA             ← tags: Database, Web Development
     │       book4: Don't Make Me..  ← tags: UX/UI Design, Web Development
     │
     ├─ 4. Create Reviews (5 reviews)
     │       book1 ← 2 reviews (1 มีรูป)
     │       book2 ← 1 review (มีรูป)
     │       book3 ← 1 review
     │       book4 ← 1 review
     │
     └─ Return: { success: true, stats: { tags: 6, books: 4, reviews: 5 } }
```

---

## 4. Module อธิบาย

### 4.1 common/upload.util.ts

**ทำหน้าที่:** รวม logic การ upload/delete ไฟล์ไว้ที่เดียว ทุก module ใช้ร่วมกัน

| Export | คำอธิบาย |
|--------|-----------|
| `UPLOAD_ROOT` | path จริงของ `uploads/` (`process.cwd()/uploads`) |
| `UPLOAD_FOLDERS` | `['covers', 'reviews']` — whitelist folder ที่อนุญาต |
| `createUploadOptions(folder)` | สร้าง Multer options (diskStorage + fileFilter + limits) |
| `buildFileUrl(folder, filename)` | สร้าง URL string `/uploads/covers/xxx.jpg` |
| `deleteUploadedFile(url?)` | รับ URL จาก DB แล้วลบไฟล์จริงบน disk |
| `ApiMultipart(fileField, fields)` | Swagger decorator สำหรับ endpoint ที่รับ multipart |

**Key logic ของ `deleteUploadedFile`:**
```
url = '/uploads/covers/abc.jpg'
split('/') → ['', 'uploads', 'covers', 'abc.jpg']
                          [2]      [3]
→ filePath = UPLOAD_ROOT/covers/abc.jpg
→ existsSync → unlinkSync
```

---

### 4.2 Tags Module

**Entity: `Tag`**

| Column | Type | ข้อมูล |
|--------|------|--------|
| `id` | `PrimaryGeneratedColumn` | auto-increment PK |
| `name` | `Column({ unique: true })` | ชื่อ tag (ห้ามซ้ำ) |
| `books` | `ManyToMany → Book` | (ไม่มี @JoinTable — ฝั่ง inverse) |

**DTO Validators:**
```
name: @IsString + @IsNotEmpty + @MaxLength(50)
```

**Service Logic:**
- `findAll()` — เรียง name ASC
- `findOne(id)` — throw 404 ถ้าไม่พบ
- `create(dto)` — ตรวจซ้ำ name → throw 409 ConflictException
- `update(id, dto)` — ตรวจซ้ำ name ก่อนแก้ไข
- `remove(id)` — load `relations: { books: true }` → ถ้ามี books → throw 409

**Routes:**
```
GET    /tags        → findAll()
GET    /tags/:id    → findOne(id)
POST   /tags        → create(dto)          body: JSON { name }
PUT    /tags/:id    → update(id, dto)      body: JSON { name }
DELETE /tags/:id    → remove(id)
```

---

### 4.3 Books Module

**Entity: `Book`**

| Column | Type | ข้อมูล |
|--------|------|--------|
| `id` | `PrimaryGeneratedColumn` | auto-increment PK |
| `title` | `Column` | ชื่อหนังสือ |
| `author` | `Column` | ชื่อผู้แต่ง |
| `publishedAt` | `CreateDateColumn` | วันที่สร้าง (auto) |
| `coverUrl` | `Column({ nullable: true })` | URL ปกหนังสือ หรือ null |
| `reviews` | `OneToMany → Review` | รีวิวทั้งหมด |
| `tags` | `ManyToMany → Tag` + `@JoinTable` | ทำ join table `book_tags_tag` |

> [!NOTE]
> `@JoinTable()` ต้องอยู่ฝั่งใดฝั่งหนึ่งของ Many-to-Many เสมอ — เราวางไว้ที่ Book
> Tag ฝั่ง inverse จึงไม่มี `@JoinTable`

**DTO: `CreateBookDto`**
```typescript
title:  @IsString + @IsNotEmpty
author: @IsString + @IsNotEmpty
tagIds: @IsOptional + @Transform (string → number[]) + @IsInt({ each: true })
```

> [!IMPORTANT]
> multipart/form-data ส่ง array เป็น **string** เสมอ  
> `tagIds=1&tagIds=2` → `["1", "2"]` ต้องใช้ `@Transform` แปลงเป็น `[1, 2]`  
> `tagIds=` (ว่าง) → `""` ต้องแปลงเป็น `[]`

**Service Logic:**
- `loadTags(tagIds)` — private helper: `findBy({ id: In(ids) })` → throw 400 ถ้า id ไม่ครบ
- `create(dto, file?)` — try/catch: ถ้า DB fail → `deleteUploadedFile(coverUrl)` rollback
- `update(id, dto, file?)` — ถ้ามีไฟล์ใหม่: บันทึก DB แล้วลบไฟล์เก่า; ถ้า fail → ลบไฟล์ใหม่
- `remove(id)` — load reviews ก่อน → เก็บ URL ทุกไฟล์ → delete DB → ลบไฟล์ทั้งหมด

**Routes:**
```
GET    /books        → findAll() + tags relation
GET    /books/:id    → findOne() + tags + reviews
POST   /books        → create(dto, file?)   multipart/form-data
PUT    /books/:id    → update(id, dto, file?) multipart/form-data
DELETE /books/:id    → remove(id)
```

---

### 4.4 Reviews Module

**Entity: `Review`**

| Column | Type | ข้อมูล |
|--------|------|--------|
| `id` | `PrimaryGeneratedColumn` | auto-increment PK |
| `rating` | `Column` | คะแนน 1-5 |
| `content` | `Column` | เนื้อหารีวิว |
| `imageUrl` | `Column({ nullable: true })` | URL รูปภาพ หรือ null |
| `bookId` | `Column` | FK อ้างอิงไป Book (เก็บเป็น column จริง) |
| `book` | `ManyToOne → Book` | relation (onDelete: CASCADE) |

> [!NOTE]
> `@JoinColumn({ name: 'bookId' })` บังคับให้ชื่อคอลัมน์ FK เป็น `bookId` แทนที่ TypeORM จะ generate เป็น `book_id`

**DTO: `CreateReviewDto`**
```typescript
bookId:  @Type(() => Number) + @IsInt    // multipart: string → number
rating:  @Type(() => Number) + @IsInt + @Min(1) + @Max(5)
content: @IsString + @IsNotEmpty
```

**Service Logic:**
- `findAll(bookId?)` — ถ้ามี `?bookId=1` → filter; ถ้าไม่มี → ดึงทั้งหมด
- `create(dto, file?)` — ตรวจ bookId มีจริง → save; try/catch rollback file
- `update/remove` — pattern เดียวกับ Books

**Routes:**
```
GET    /reviews           → findAll(all)
GET    /reviews?bookId=1  → findAll(bookId=1)
GET    /reviews/:id       → findOne(id)
POST   /reviews           → create(dto, file?)   multipart (field: "image")
PUT    /reviews/:id       → update(id, dto, file?) multipart (field: "image")
DELETE /reviews/:id       → remove(id)
```

---

### 4.5 Uploads Module

**ทำหน้าที่:** Serve static files จาก `uploads/` โดยตรง

**Route:**
```
GET /uploads/:folder/:filename
```

**Security:**
1. ตรวจ `folder` ต้องอยู่ใน `UPLOAD_FOLDERS` whitelist → ป้องกัน path traversal
2. `basename(filename)` → ตัด `../` ออก → ป้องกัน directory traversal
3. `existsSync` → throw 404 ถ้าไฟล์ไม่มี
4. `res.sendFile(filePath)` → auto set `Content-Type` ตาม extension

---

### 4.6 Seed Module

**ทำหน้าที่:** populate ฐานข้อมูลด้วยข้อมูลตัวอย่าง (clear แล้ว insert ใหม่)

**SeedService.run() ลำดับสำคัญ:**
```
1. DELETE reviews  (ต้องก่อน เพราะมี FK → books)
2. DELETE books    (ต้องก่อน เพราะมี FK → tags ผ่าน join table)
3. DELETE tags
4. INSERT tags[6]
5. INSERT books[4] + seed PNG files
6. INSERT reviews[5] + seed PNG files
```

**`createSampleFile()`** — สร้างไฟล์ PNG จริงขนาด 1x1 pixel (Base64 decode)  
เพื่อให้ URL ที่บันทึกใน DB ใช้งานได้จริงผ่าน `GET /uploads/...`

**สองวิธีเรียก Seed:**

| วิธี | ใช้เมื่อ |
|------|---------|
| `npm run seed` | CLI (ไม่ต้องรัน server) |
| `GET /seed` หรือ `POST /seed` | Server รันอยู่, ทดสอบผ่าน browser/Swagger |

---

## 5. Full Code Snippets

### src/main.ts

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // เปิด CORS ให้ frontend (Next.js รันที่ port 3000) เรียก API ได้
  app.enableCors({ origin: 'http://localhost:3000' });

  // ValidationPipe = เปิดใช้ decorator ที่ DTO (@IsString, @Min ฯลฯ)
  //  whitelist: true  → ตัด field ที่ไม่อยู่ใน DTO ออก
  //  transform: true  → แปลงค่าที่รับมาให้เป็นชนิดที่กำหนดใน DTO
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Swagger UI ที่ http://localhost:3001/docs (JSON ที่ /docs-json)
  const config = new DocumentBuilder()
    .setTitle('Book API')
    .setDescription('Book / Review / Tag + อัปโหลดไฟล์')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger UI is available at: http://localhost:${port}/docs`);
}
await bootstrap();
```

---

### src/app.module.ts

```typescript
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
      database: 'dev.db', // ไฟล์ฐานข้อมูล อยู่ที่ root ของ backend
      autoLoadEntities: true, // entity ที่ลงทะเบียนผ่าน forFeature() ใน module ต่างๆ จะถูกโหลดอัตโนมัติ
      synchronize: true, // sync/สร้าง schema จาก entity อัตโนมัติ (ใช้เฉพาะ dev เท่านั้น!)
    }),
    BooksModule,
    ReviewsModule,
    TagsModule,
    UploadsModule,
    SeedModule,
  ],
})
export class AppModule {}
```

---

### src/seed.ts

```typescript
// src/seed.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { SeedService } from './seed/seed.service.js';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const seedService = app.get(SeedService);
  const result = await seedService.run();

  console.log('Results:', JSON.stringify(result, null, 2));

  await app.close();
}

bootstrap().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
```

---

### src/common/upload.util.ts

```typescript
// src/common/upload.util.ts
import { BadRequestException, applyDecorators } from '@nestjs/common';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { existsSync, unlinkSync } from 'fs';
import { basename, extname, join } from 'path';

// root ของโฟลเดอร์ uploads = <root โปรเจค>/uploads
export const UPLOAD_ROOT = join(process.cwd(), 'uploads');

// whitelist โฟลเดอร์ที่อนุญาต
export const UPLOAD_FOLDERS = ['covers', 'reviews'] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

/**
 * สร้าง options สำหรับ FileInterceptor
 * ตัวอย่าง: FileInterceptor('cover', createUploadOptions('covers'))
 */
export function createUploadOptions(folder: UploadFolder) {
  return {
    // diskStorage = บันทึกไฟล์ลง disk (แทนที่จะเก็บใน memory)
    storage: diskStorage({
      destination: join(UPLOAD_ROOT, folder),
      // ตั้งชื่อไฟล์ใหม่ด้วย timestamp/random เพื่อป้องกันชื่อซ้ำ
      filename: (
        _req: unknown,
        file: Express.Multer.File,
        cb: (error: Error | null, filename: string) => void,
      ) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${unique}${extname(file.originalname).toLowerCase()}`);
      },
    }),

    // จำกัดขนาดไฟล์ 2MB (ถ้าเกิน Nest จะส่ง 413 Payload Too Large)
    limits: { fileSize: 2 * 1024 * 1024 },

    // รับเฉพาะ jpg / png / webp
    fileFilter: (
      _req: unknown,
      file: Express.Multer.File,
      cb: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      if (!/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
        return cb(new BadRequestException('รับเฉพาะไฟล์ jpg, png, webp'), false);
      }
      cb(null, true);
    },
  };
}

/**
 * ช่วยบอก Swagger UI: ว่า endpoint นี้เป็น multipart/form-data พร้อมบอกชื่อไฟล์
 * ตัวอย่างใช้: @ApiMultipart('cover', { title: { type: 'string' } })
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
 * ลบไฟล์จริงบน disk จาก URL ที่เก็บใน DB (เช่น /uploads/covers/xxx.jpg)
 * ถ้า null/undefined ไม่ทำอะไร (ปลอดภัยเสมอ)
 */
export function deleteUploadedFile(url?: string | null) {
  if (!url) return;
  const [, , folder, name] = url.split('/'); // ['', 'uploads', 'covers', 'xxx.jpg']
  if (!UPLOAD_FOLDERS.includes(folder as UploadFolder) || !name) return;
  // basename() ป้องกัน path traversal เช่น ../../etc/passwd
  const filePath = join(UPLOAD_ROOT, folder, basename(name));
  if (existsSync(filePath)) unlinkSync(filePath);
}
```

---

### src/tags/entities/tag.entity.ts

```typescript
import { Column, Entity, ManyToMany, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { Book } from '../../books/entities/book.entity.js';

@Entity()
export class Tag {
  @PrimaryGeneratedColumn()
  id: number;

  // unique = ห้ามมี tag ชื่อซ้ำ
  @Column({ unique: true })
  name: string;

  // ฝั่ง "ที่ไม่ถือ join table" ใน Many-to-Many (ไม่มี @JoinTable → ไม่มี cascade)
  @ManyToMany(() => Book, (book) => book.tags)
  books: Relation<Book>[];
}
```

---

### src/tags/dto/create-tag.dto.ts

```typescript
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;
}
```

---

### src/tags/tags.service.ts

```typescript
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTagDto } from './dto/create-tag.dto.js';
import { UpdateTagDto } from './dto/update-tag.dto.js';
import { Tag } from './entities/tag.entity.js';

@Injectable()
export class TagsService {
  constructor(@InjectRepository(Tag) private readonly repo: Repository<Tag>) {}

  findAll() {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: number) {
    const tag = await this.repo.findOneBy({ id });
    if (!tag) throw new NotFoundException('ไม่พบ Tag');
    return tag;
  }

  async create(dto: CreateTagDto) {
    if (await this.repo.findOneBy({ name: dto.name })) {
      throw new ConflictException('มี Tag นี้ในระบบแล้ว');
    }
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: UpdateTagDto) {
    const tag = await this.findOne(id);
    if (dto.name && dto.name !== tag.name) {
      if (await this.repo.findOneBy({ name: dto.name })) {
        throw new ConflictException('มี Tag นี้ในระบบแล้ว');
      }
      tag.name = dto.name;
    }
    return this.repo.save(tag);
  }

  async remove(id: number) {
    const tag = await this.repo.findOne({ where: { id }, relations: { books: true } });
    if (!tag) throw new NotFoundException('ไม่พบ Tag');

    if (tag.books.length > 0) {
      throw new ConflictException(`Tag นี้ถูกใช้โดย ${tag.books.length} หนังสือ`);
    }
    await this.repo.remove(tag);
    return { deleted: true };
  }
}
```

---

### src/tags/tags.controller.ts

```typescript
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateTagDto } from './dto/create-tag.dto.js';
import { UpdateTagDto } from './dto/update-tag.dto.js';
import { TagsService } from './tags.service.js';

@ApiTags('tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  findAll() {
    return this.tagsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tagsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTagDto) {
    return this.tagsService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTagDto) {
    return this.tagsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tagsService.remove(id);
  }
}
```

---

### src/tags/tags.module.ts

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tag } from './entities/tag.entity.js';
import { TagsController } from './tags.controller.js';
import { TagsService } from './tags.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Tag])],
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TagsService],
})
export class TagsModule {}
```

---

### src/books/entities/book.entity.ts

```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Review } from '../../reviews/entities/review.entity.js';
import { Tag } from '../../tags/entities/tag.entity.js';

@Entity()
export class Book {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  author: string;

  // CreateDateColumn = กำหนดวันที่สร้างอัตโนมัติตอนสร้าง record (เทียบกับ @default(now()))
  @CreateDateColumn()
  publishedAt: Date;

  // nullable = ไม่จำเป็นต้องมีรูป
  @Column({ type: 'varchar', nullable: true })
  coverUrl: string | null;

  // One-to-Many: หนังสือ 1 เล่มมีรีวิวได้หลายรายการ (จัดการ FK ที่ Review.bookId)
  @OneToMany(() => Review, (review) => review.book)
  reviews: Relation<Review>[];

  // Many-to-Many: ไม่มี cascade → ลบ book ไม่ลบ Tag
  // @JoinTable() หมายถึง "ผู้ถือ join table" (ผู้สร้างตาราง) ชื่อตาราง book_tags_tag
  @ManyToMany(() => Tag, (tag) => tag.books)
  @JoinTable()
  tags: Relation<Tag>[];
}
```

---

### src/books/dto/create-book.dto.ts

```typescript
import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBookDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  author: string;

  // ปัญหาของ multipart/form-data: ค่าจะถูกส่งมาเป็น string เสมอ
  //  - กรณี tagIds เดียว  → ได้ "1" (ไม่ใช่ array)
  //  - กรณีหลาย tagIds   → ได้ ["1","2"]
  //  - กรณีส่งค่า ""     → หมายความว่า "ไม่มี tag"
  // @Transform แปลงค่าที่รับมาให้เป็น number[] ก่อนที่ @IsInt จะตรวจสอบ
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value == null ? [] : ([] as unknown[]).concat(value).map(Number),
  )
  @IsInt({ each: true })
  tagIds?: number[];
}
```

---

### src/books/books.service.ts

```typescript
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { buildFileUrl, deleteUploadedFile } from '../common/upload.util.js';
import { Tag } from '../tags/entities/tag.entity.js';
import { CreateBookDto } from './dto/create-book.dto.js';
import { UpdateBookDto } from './dto/update-book.dto.js';
import { Book } from './entities/book.entity.js';

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book) private readonly repo: Repository<Book>,
    @InjectRepository(Tag) private readonly tagRepo: Repository<Tag>,
  ) {}

  // ดึงหนังสือทุกเล่ม + tag แนบมาด้วย (relations ที่ไม่ระบุจะไม่ดึง tags มาให้)
  findAll() {
    return this.repo.find({ relations: { tags: true }, order: { id: 'DESC' } });
  }

  // ดึงหนังสือเล่มเดียว + tags + reviews (ข้อมูลครบสำหรับหน้า detail)
  async findOne(id: number) {
    const book = await this.repo.findOne({
      where: { id },
      relations: { tags: true, reviews: true },
      order: { reviews: { id: 'DESC' } },
    });
    if (!book) throw new NotFoundException('ไม่พบหนังสือ');
    return book;
  }

  // แปลง tagIds → entity Tag (ตรวจ id ที่ไม่มีในระบบจะ error)
  private async loadTags(tagIds: number[] = []) {
    if (tagIds.length === 0) return [];
    const unique = [...new Set(tagIds)];
    const tags = await this.tagRepo.findBy({ id: In(unique) });
    if (tags.length !== unique.length) throw new BadRequestException('มี tagId ที่ไม่มีในระบบ');
    return tags;
  }

  async create(dto: CreateBookDto, file?: Express.Multer.File) {
    const coverUrl = file ? buildFileUrl('covers', file.filename) : null;
    const { tagIds, ...data } = dto; // แยก tagIds ออก เพราะ entity ไม่มี field นั้น
    try {
      const tags = await this.loadTags(tagIds);
      return await this.repo.save(this.repo.create({ ...data, tags, coverUrl }));
    } catch (e) {
      // multer บันทึกไฟล์ลง disk ก่อนแล้ว ถ้า DB error ต้องลบไฟล์ที่อัปโหลดแล้วออกด้วย
      deleteUploadedFile(coverUrl);
      throw e;
    }
  }

  async update(id: number, dto: UpdateBookDto, file?: Express.Multer.File) {
    const newUrl = file ? buildFileUrl('covers', file.filename) : null;
    try {
      const book = await this.findOne(id);
      const { tagIds, ...data } = dto;
      Object.assign(book, data); // อัปเดต title/author ที่เปลี่ยน

      // tagIds === undefined → ไม่ได้ส่งมา = รักษา tag เดิม
      // tagIds เป็น []        → ลบ tag ทั้งหมด
      if (tagIds !== undefined) book.tags = await this.loadTags(tagIds);

      const oldUrl = book.coverUrl;
      if (newUrl) book.coverUrl = newUrl; // ไม่อัปโหลดไฟล์ใหม่ = เก็บไฟล์เดิม

      const saved = await this.repo.save(book);
      if (newUrl) deleteUploadedFile(oldUrl); // ลบของเก่าหลัง "บันทึก DB สำเร็จ"
      return saved;
    } catch (e) {
      deleteUploadedFile(newUrl); // บันทึกไม่สำเร็จ → ลบไฟล์ใหม่ที่ upload มาแล้ว
      throw e;
    }
  }

  async remove(id: number) {
    const book = await this.findOne(id); // โหลด reviews มาด้วย

    // เก็บ path ไฟล์ทั้งหมดที่ต้องลบ: ปกหนังสือ + รูปของรีวิวทุกรายการ
    const files = [book.coverUrl, ...book.reviews.map((r) => r.imageUrl)];

    // delete(id) → DB จัดการ cascade: Review ถูกลบ, ปลด tag, Tag ไม่ถูกลบ
    await this.repo.delete(id);

    // DB cascade จัดการ "ข้อมูล" ไม่ใช่ "ไฟล์" ต้องลบไฟล์เอง
    files.forEach((url) => deleteUploadedFile(url));
    return { deleted: true };
  }
}
```

---

### src/books/books.controller.ts

```typescript
import {
  Body, Controller, Delete, Get, Param, ParseIntPipe,
  Post, Put, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { ApiMultipart, createUploadOptions } from '../common/upload.util.js';
import { BooksService } from './books.service.js';
import { CreateBookDto } from './dto/create-book.dto.js';
import { UpdateBookDto } from './dto/update-book.dto.js';

// field ที่ประกาศให้ Swagger UI แสดง (ใช้ตอนเปิด /docs แล้วกด Try it out)
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
  @ApiMultipart('cover', BOOK_FIELDS) // บอก Swagger ว่าเป็น multipart + มีไฟล์ชื่อ cover
  // FileInterceptor('cover', ...) → รับไฟล์จาก field ชื่อ "cover" แล้วบันทึกใน uploads/covers
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
```

---

### src/books/books.module.ts

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tag } from '../tags/entities/tag.entity.js';
import { BooksController } from './books.controller.js';
import { BooksService } from './books.service.js';
import { Book } from './entities/book.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Book, Tag])],  // ต้อง register Tag ด้วย เพราะ Service ใช้ tagRepo
  controllers: [BooksController],
  providers: [BooksService],
  exports: [BooksService],
})
export class BooksModule {}
```

---

### src/reviews/entities/review.entity.ts

```typescript
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { Book } from '../../books/entities/book.entity.js';

@Entity()
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  rating: number; // 1-5 (ตรวจสอบที่ DTO)

  @Column()
  content: string;

  // รูปประกอบรีวิว (ไม่จำเป็นต้องมี)
  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  // เก็บค่า FK ตรงๆ เพื่อให้ query ด้วย where: { bookId } ได้ง่าย (ไม่ต้อง join)
  @Column()
  bookId: number;

  // Many-to-One: รีวิวหลายรายการอ้างไปยังหนังสือเล่มเดียว
  // onDelete: 'CASCADE' → ลบ Book แล้ว Review จะถูกลบอัตโนมัติจาก DB
  @ManyToOne(() => Book, (book) => book.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookId' }) // บังคับให้ชื่อคอลัมน์ FK เป็น bookId ตรงๆ
  book: Relation<Book>;
}
```

---

### src/reviews/dto/create-review.dto.ts

```typescript
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  // multipart ส่งค่ามาเป็น string → @Type(() => Number) แปลงเป็น number ก่อนตรวจสอบ
  @Type(() => Number)
  @IsInt()
  bookId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1) // ข้อกำหนด: rating ต้องอยู่ใน 1-5
  @Max(5)
  rating: number;

  @IsString()
  @IsNotEmpty()
  content: string;

  // ไม่มีรูปใน DTO: multer จัดการแยก แล้วส่งผ่าน controller ด้วย @UploadedFile()
}
```

---

### src/reviews/reviews.service.ts

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from '../books/entities/book.entity.js';
import { buildFileUrl, deleteUploadedFile } from '../common/upload.util.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';
import { Review } from './entities/review.entity.js';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private readonly repo: Repository<Review>,
    @InjectRepository(Book) private readonly bookRepo: Repository<Book>, // ใช้ตรวจสอบ bookId ก่อนสร้าง
  ) {}

  // GET /reviews หรือ GET /reviews?bookId=1
  findAll(bookId?: number) {
    return this.repo.find({ where: bookId ? { bookId } : {}, order: { id: 'DESC' } });
  }

  async findOne(id: number) {
    const review = await this.repo.findOneBy({ id });
    if (!review) throw new NotFoundException('ไม่พบรีวิว');
    return review;
  }

  async create(dto: CreateReviewDto, file?: Express.Multer.File) {
    const imageUrl = file ? buildFileUrl('reviews', file.filename) : null;
    try {
      const book = await this.bookRepo.findOneBy({ id: dto.bookId });
      if (!book) throw new NotFoundException('ไม่พบหนังสือที่ต้องการรีวิว');

      return await this.repo.save(
        this.repo.create({
          bookId: dto.bookId,
          rating: dto.rating,
          content: dto.content,
          imageUrl,
        }),
      );
    } catch (e) {
      deleteUploadedFile(imageUrl); // ไฟล์อัปโหลดแล้วไม่สำเร็จ → ลบออก
      throw e;
    }
  }

  async update(id: number, dto: UpdateReviewDto, file?: Express.Multer.File) {
    const newUrl = file ? buildFileUrl('reviews', file.filename) : null;
    try {
      const review = await this.findOne(id);
      const oldUrl = review.imageUrl;

      if (dto.rating !== undefined) review.rating = dto.rating;
      if (dto.content !== undefined) review.content = dto.content;
      if (newUrl) review.imageUrl = newUrl; // ไม่อัปโหลดรูปใหม่ = เก็บรูปเดิม

      const saved = await this.repo.save(review);
      if (newUrl) deleteUploadedFile(oldUrl); // ลบรูปเก่าหลังบันทึกสำเร็จ
      return saved;
    } catch (e) {
      deleteUploadedFile(newUrl); // บันทึกไม่สำเร็จ → ลบไฟล์ใหม่ที่ upload มาแล้ว
      throw e;
    }
  }

  async remove(id: number) {
    const review = await this.findOne(id);
    const imageUrl = review.imageUrl; // เก็บก่อน เพราะหลัง remove() entity จะหายไป
    await this.repo.remove(review);
    deleteUploadedFile(imageUrl); // ลบไฟล์รูปออกด้วย
    return { deleted: true };
  }
}
```

---

### src/reviews/reviews.controller.ts

```typescript
import {
  Body, Controller, Delete, Get, Param, ParseIntPipe,
  Post, Put, Query, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiMultipart, createUploadOptions } from '../common/upload.util.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';
import { ReviewsService } from './reviews.service.js';

const REVIEW_FIELDS = {
  rating: { type: 'integer', minimum: 1, maximum: 5 },
  content: { type: 'string' },
};

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiMultipart('image', { bookId: { type: 'integer' }, ...REVIEW_FIELDS })
  // รับไฟล์จาก field ชื่อ "image" แล้วบันทึกใน uploads/reviews
  @UseInterceptors(FileInterceptor('image', createUploadOptions('reviews')))
  create(@Body() dto: CreateReviewDto, @UploadedFile() file?: Express.Multer.File) {
    return this.reviewsService.create(dto, file);
  }

  @Get()
  @ApiQuery({ name: 'bookId', required: false, type: Number })
  findAll(
    // optional: true = ไม่ส่ง ?bookId มาก็ได้ (ถ้าไม่มี = ดึงรีวิวทั้งหมด)
    @Query('bookId', new ParseIntPipe({ optional: true })) bookId?: number,
  ) {
    return this.reviewsService.findAll(bookId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.findOne(id);
  }

  @Put(':id')
  @ApiMultipart('image', REVIEW_FIELDS) // ตอน update ไม่ต้องส่ง bookId
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
```

---

### src/reviews/reviews.module.ts

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from '../books/entities/book.entity.js';
import { Review } from './entities/review.entity.js';
import { ReviewsController } from './reviews.controller.js';
import { ReviewsService } from './reviews.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Book])], // Service ใช้ Book repository ด้วย
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
```

---

### src/uploads/uploads.controller.ts

```typescript
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
    // ตรวจสอบว่าโฟลเดอร์ที่ขอมานั้นอยู่ใน whitelist โฟลเดอร์ที่อนุญาต
    if (!(UPLOAD_FOLDERS as readonly string[]).includes(folder)) {
      throw new NotFoundException();
    }

    // basename() ตัด "../" ออก ป้องกัน path traversal
    const filePath = join(UPLOAD_ROOT, folder, basename(filename));
    if (!existsSync(filePath)) throw new NotFoundException('ไม่พบไฟล์');

    // sendFile ส่งไฟล์จริง พร้อม Content-Type อัตโนมัติ (image/jpeg, image/png ...)
    return res.sendFile(filePath);
  }
}
```

---

### src/uploads/uploads.module.ts

```typescript
import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller.js';

@Module({
  controllers: [UploadsController],
})
export class UploadsModule {}
```

---

### src/seed/seed.service.ts

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { UPLOAD_ROOT } from '../common/upload.util.js';
import { Tag } from '../tags/entities/tag.entity.js';
import { Book } from '../books/entities/book.entity.js';
import { Review } from '../reviews/entities/review.entity.js';

// Base64 1x1 PNG ใช้สำหรับสร้างไฟล์รูปภาพตัวอย่าง
const DUMMY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Tag) private readonly tagRepo: Repository<Tag>,
    @InjectRepository(Book) private readonly bookRepo: Repository<Book>,
    @InjectRepository(Review) private readonly reviewRepo: Repository<Review>,
  ) {}

  // สร้างไฟล์ PNG จริง (1x1 pixel) เพื่อให้ URL ใช้งานได้จริง
  private createSampleFile(subfolder: 'covers' | 'reviews', filename: string): string {
    const targetDir = join(UPLOAD_ROOT, subfolder);
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }
    const filePath = join(targetDir, filename);
    writeFileSync(filePath, Buffer.from(DUMMY_PNG_BASE64, 'base64'));
    return `/uploads/${subfolder}/${filename}`;
  }

  async run() {
    this.logger.log('🌱 Starting database seeding...');

    // 1. ลบข้อมูลเก่าตามลำดับ Foreign Key: Review → Book → Tag
    await this.reviewRepo.createQueryBuilder().delete().execute();
    await this.bookRepo.createQueryBuilder().delete().execute();
    await this.tagRepo.createQueryBuilder().delete().execute();

    // 2. สร้าง Tags ทั้งหมดที่ต้องการ
    const tagsData = [
      { name: 'Programming' },
      { name: 'Clean Architecture' },
      { name: 'Web Development' },
      { name: 'Database' },
      { name: 'UX/UI Design' },
      { name: 'Classic' },
    ];
    const createdTags = await this.tagRepo.save(tagsData.map((t) => this.tagRepo.create(t)));
    const tagMap = new Map<string, Tag>();
    createdTags.forEach((t) => tagMap.set(t.name, t));

    // 3. สร้าง Books พร้อมไฟล์ปกตัวอย่าง
    const cover1 = this.createSampleFile('covers', `seed-clean-code-${Date.now()}.png`);
    const book1 = await this.bookRepo.save(
      this.bookRepo.create({
        title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
        author: 'Robert C. Martin',
        coverUrl: cover1,
        tags: [tagMap.get('Programming')!, tagMap.get('Clean Architecture')!, tagMap.get('Classic')!],
      }),
    );

    const cover2 = this.createSampleFile('covers', `seed-pragmatic-${Date.now()}.png`);
    const book2 = await this.bookRepo.save(
      this.bookRepo.create({
        title: 'The Pragmatic Programmer: Your Journey To Mastery',
        author: 'Andrew Hunt & David Thomas',
        coverUrl: cover2,
        tags: [tagMap.get('Programming')!, tagMap.get('Classic')!],
      }),
    );

    const cover3 = this.createSampleFile('covers', `seed-ddia-${Date.now()}.png`);
    const book3 = await this.bookRepo.save(
      this.bookRepo.create({
        title: 'Designing Data-Intensive Applications',
        author: 'Martin Kleppmann',
        coverUrl: cover3,
        tags: [tagMap.get('Database')!, tagMap.get('Web Development')!],
      }),
    );

    const cover4 = this.createSampleFile('covers', `seed-dont-make-me-think-${Date.now()}.png`);
    const book4 = await this.bookRepo.save(
      this.bookRepo.create({
        title: "Don't Make Me Think, Revisited: A Common Sense Approach to Web Usability",
        author: 'Steve Krug',
        coverUrl: cover4,
        tags: [tagMap.get('UX/UI Design')!, tagMap.get('Web Development')!],
      }),
    );

    // 4. สร้าง Reviews พร้อมไฟล์รูปตัวอย่าง
    const reviewImg1 = this.createSampleFile('reviews', `seed-review-1-${Date.now()}.png`);
    const reviewImg2 = this.createSampleFile('reviews', `seed-review-2-${Date.now()}.png`);

    const createdReviews = await this.reviewRepo.save([
      this.reviewRepo.create({ bookId: book1.id, rating: 5, content: '...', imageUrl: reviewImg1 }),
      this.reviewRepo.create({ bookId: book1.id, rating: 4, content: '...', imageUrl: null }),
      this.reviewRepo.create({ bookId: book2.id, rating: 5, content: '...', imageUrl: reviewImg2 }),
      this.reviewRepo.create({ bookId: book3.id, rating: 5, content: '...', imageUrl: null }),
      this.reviewRepo.create({ bookId: book4.id, rating: 5, content: '...', imageUrl: null }),
    ]);

    this.logger.log('✅ Seeding completed successfully!');

    return {
      success: true,
      message: 'Database seeded successfully',
      stats: {
        tags: createdTags.length,
        books: 4,
        reviews: createdReviews.length,
      },
    };
  }
}
```

---

### src/seed/seed.controller.ts

```typescript
import { Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SeedService } from './seed.service.js';

@ApiTags('seed')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post()
  @ApiOperation({ summary: 'Seed Database ผ่าน POST' })
  runSeedPost() {
    return this.seedService.run();
  }

  @Get()
  @ApiOperation({ summary: 'Seed Database ผ่าน GET (เปิดผ่าน browser ได้เลย)' })
  runSeedGet() {
    return this.seedService.run();
  }
}
```

---

### src/seed/seed.module.ts

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from '../books/entities/book.entity.js';
import { Review } from '../reviews/entities/review.entity.js';
import { Tag } from '../tags/entities/tag.entity.js';
import { SeedController } from './seed.controller.js';
import { SeedService } from './seed.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Tag, Book, Review])],
  controllers: [SeedController],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
```

---

## 6. cURL Examples

### Tags

```bash
# ดึง tag ทั้งหมด
curl http://localhost:3001/tags

# ดึง tag ตาม id
curl http://localhost:3001/tags/1

# สร้าง tag ใหม่
curl -X POST http://localhost:3001/tags \
  -H "Content-Type: application/json" \
  -d '{"name":"JavaScript"}'

# แก้ไข tag
curl -X PUT http://localhost:3001/tags/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"TypeScript"}'

# ลบ tag (จะ error 409 ถ้ายังมี books ใช้อยู่)
curl -X DELETE http://localhost:3001/tags/1
```

### Books

```bash
# ดึงหนังสือทั้งหมด
curl http://localhost:3001/books

# ดึงหนังสือตาม id (พร้อม tags + reviews)
curl http://localhost:3001/books/1

# สร้างหนังสือ (ไม่มีรูปปก)
curl -X POST http://localhost:3001/books \
  -F "title=Clean Code" \
  -F "author=Robert C. Martin" \
  -F "tagIds=1" \
  -F "tagIds=2"

# สร้างหนังสือ (มีรูปปก)
curl -X POST http://localhost:3001/books \
  -F "title=Clean Code" \
  -F "author=Robert C. Martin" \
  -F "tagIds=1" \
  -F "cover=@/path/to/cover.jpg"

# แก้ไขหนังสือ (เปลี่ยนรูปปก)
curl -X PUT http://localhost:3001/books/1 \
  -F "title=Clean Code Updated" \
  -F "cover=@/path/to/new-cover.jpg"

# ลบหนังสือ (ลบ reviews + ไฟล์ทั้งหมดด้วย)
curl -X DELETE http://localhost:3001/books/1
```

### Reviews

```bash
# ดึงรีวิวทั้งหมด
curl http://localhost:3001/reviews

# ดึงรีวิวเฉพาะ bookId=1
curl "http://localhost:3001/reviews?bookId=1"

# ดึงรีวิวตาม id
curl http://localhost:3001/reviews/1

# สร้างรีวิว (ไม่มีรูป)
curl -X POST http://localhost:3001/reviews \
  -F "bookId=1" \
  -F "rating=5" \
  -F "content=หนังสือดีมาก!"

# สร้างรีวิว (มีรูป)
curl -X POST http://localhost:3001/reviews \
  -F "bookId=1" \
  -F "rating=5" \
  -F "content=หนังสือดีมาก!" \
  -F "image=@/path/to/photo.jpg"

# แก้ไขรีวิว
curl -X PUT http://localhost:3001/reviews/1 \
  -F "rating=4" \
  -F "content=ดีแต่ยากนิดนึง"

# ลบรีวิว
curl -X DELETE http://localhost:3001/reviews/1
```

### Uploads & Seed

```bash
# ดูรูปภาพ (ปก / รีวิว)
curl http://localhost:3001/uploads/covers/1234567890-123456789.png
curl http://localhost:3001/uploads/reviews/1234567890-987654321.jpg

# Seed ฐานข้อมูล
curl -X POST http://localhost:3001/seed
curl http://localhost:3001/seed
```

---

## 7. Gotchas & Tips

> [!CAUTION]
> **ห้ามใช้ `synchronize: true` ใน Production!**  
> TypeORM จะ drop/alter table อัตโนมัติ อาจทำให้ข้อมูลหายได้

> [!WARNING]
> **ESM `.js` extension บังคับ**  
> project ใช้ `"type": "module"` + TypeScript `nodenext`  
> ทุก relative import ต้องมี `.js` ท้าย แม้ว่า source จะเป็น `.ts` ก็ตาม
> ```typescript
> // ✅ ถูก
> import { Tag } from './entities/tag.entity.js';
> // ❌ ผิด
> import { Tag } from './entities/tag.entity';
> ```

> [!WARNING]
> **ใช้ `Relation<T>` สำหรับ bidirectional relations**  
> TypeORM + ESM มีปัญหา circular initialization error  
> ต้องใช้ `Relation<Book>[]` แทน `Book[]` ตรงๆ ใน entity fields  
> ```typescript
> // ✅ ถูก
> books: Relation<Book>[];
> // ❌ ผิด — จะ error: Cannot access 'Book' before initialization
> books: Book[];
> ```

> [!IMPORTANT]
> **ใช้ `better-sqlite3` ไม่ใช่ `sqlite3`**  
> TypeORM v1.x ลบ `type: 'sqlite'` ออกแล้ว  
> ต้องติดตั้ง `better-sqlite3` และใช้ `type: 'better-sqlite3'`

> [!TIP]
> **อย่าตั้ง `Content-Type` เอง ตอนส่ง FormData**  
> browser/curl จะตั้ง `Content-Type: multipart/form-data; boundary=xxx` ให้อัตโนมัติ  
> ถ้าตั้งเองจะทำให้ multer parse ไม่ได้

> [!TIP]
> **`tagIds` จาก multipart จะเป็น string เสมอ**  
> ต้องใช้ `@Transform` แปลงก่อน `@IsInt`:
> ```typescript
> @Transform(({ value }) => ([] as unknown[]).concat(value).map(Number))
> @IsInt({ each: true })
> tagIds?: number[];
> ```

> [!TIP]
> **Reset ฐานข้อมูลถ้า schema เปลี่ยน**  
> ถ้า TypeORM `synchronize` fail ให้ลบ `dev.db` แล้วรันใหม่:
> ```bash
> Remove-Item dev.db
> npm run start:dev
> npm run seed
> ```

> [!NOTE]
> **File delete เกิดหลัง DB success เสมอ**  
> - Create: บันทึก DB สำเร็จ → ใช้งาน URL; ถ้า fail → ลบไฟล์ทันที (rollback)
> - Update: บันทึก DB สำเร็จ → ลบไฟล์เก่า; ถ้า fail → ลบไฟล์ใหม่ (rollback)
> - Delete: ลบ DB สำเร็จ → ลบไฟล์ทั้งหมด

---

*Generated for `book-final-api` project — NestJS v12 + TypeORM v1 + better-sqlite3*
