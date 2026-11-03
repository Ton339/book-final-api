# คู่มือ Gen Backend NestJS จาก OpenAPI ด้วย `@snow-tzu/nest-openapi-code-generator`

สำหรับซ้อมสอบ Web Engineering: Book / Review / Tag + อัพโหลดปก (Nest.js + TypeORM + SQLite)

> **หมายเหตุ:** คู่มือนี้อ้างอิง README ของแพ็กเกจ แต่ผู้เขียนยังไม่ได้รันทดสอบจริง ให้ลองซ้อมรันทั้งชุดก่อนวันสอบ

---

## 1. มันคืออะไร / ทำงานยังไง

เป็น **contract-first generator**: อ่านไฟล์ OpenAPI (3.1) แล้วสร้าง

| สิ่งที่ gen ให้ | รายละเอียด |
|---|---|
| Controller (abstract) | มี `@Get/@Post/@Body/@Param/@ApiResponse` ครบ |
| DTO | class + `class-validator` + `@ApiProperty` |
| Types | TypeScript types |
| แปลง path | `{id}` → `:id` อัตโนมัติ |

**หลักการ: base class มี decorator ครบ, คุณ `extends` แล้วเขียนแค่ logic**

```
openapi.yaml                     ไฟล์ที่ gen ออกมา                         ไฟล์ที่คุณเขียนเอง
────────────                     ───────────────                           ──────────────────
paths:                           book.controller.base.ts                   books.controller.ts
  /books:                          abstract class BookControllerBase         class BooksController
    get:                             @Get('/books')                            extends BookControllerBase {
      operationId: getBooks   →      _getBooks() { return this.getBooks() }      getBooks() { ... }
                                     abstract getBooks()                       }
components:                      book.dto.ts
  schemas:                         class BookDto { @IsString() title }
    Book: ...              →
```

กฎสำคัญ:

- ชื่อ method มาจาก **`operationId`** (ว่างหรือซ้ำ = ชื่อเพี้ยน)
- DTO มาจาก **`components.schemas`**
- ชื่อ class มาจาก **ชื่อไฟล์ spec** (ดูหัวข้อ 4)

---

## 2. ติดตั้ง

```bash
cd backend
npm i -D @snow-tzu/nest-openapi-code-generator
npm i @nestjs/swagger class-validator class-transformer
mkdir specs
```

---

## 3. ได้ไฟล์ OpenAPI มาจากไหน

| ที่มา | วิธี |
|---|---|
| อาจารย์ให้ `.yaml/.json` | วางใน `specs/` ได้เลย |
| ได้เป็น **Postman collection** | `npx postman-to-openapi collection.json -f specs/book.openapi.yml` |
| spec เป็น Swagger 2.0 / OpenAPI 3.0 | แก้บรรทัดแรกเป็น `openapi: 3.1.0` แล้วลอง หรือแปลงที่ editor.swagger.io (Edit → Convert) |

---

## 4. ตั้งชื่อไฟล์ spec ให้ถูก

ชื่อไฟล์กำหนดชื่อ class ที่ได้ (แยกด้วย `.` `-` `_` แล้วทำ PascalCase)

| Spec file | Controller class | DTO file |
|---|---|---|
| `book.openapi.yaml` | `BookControllerBase` | `book.dto.ts` |
| `review.openapi.yaml` | `ReviewControllerBase` | `review.dto.ts` |
| `tag.openapi.yaml` | `TagControllerBase` | `tag.dto.ts` |
| `order-management.openapi.yaml` | `OrderManagementControllerBase` | `order-management.dto.ts` |

หนึ่งไฟล์ spec = หนึ่ง controller base

---

## 5. ตัวอย่าง spec

### `specs/book.openapi.yaml`

```yaml
openapi: 3.1.0
info:
  title: Book API
  version: 1.0.0

paths:
  /books:
    get:
      operationId: getBooks
      summary: List all books
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Book'
    post:
      operationId: createBook
      summary: Create a book
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateBookRequest'
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Book'

  /books/{id}:
    get:
      operationId: getBookById
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: integer }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Book'
    put:
      operationId: updateBook
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: integer }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateBookRequest'
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Book'
    delete:
      operationId: deleteBook
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: integer }
      responses:
        '200':
          description: Deleted

components:
  schemas:
    Book:
      type: object
      required: [id, title, author, publishedAt]
      properties:
        id:          { type: integer }
        title:       { type: string, minLength: 1 }
        author:      { type: string, minLength: 1 }
        publishedAt: { type: string, format: date-time }
        coverUrl:    { type: string, nullable: true }

    CreateBookRequest:
      type: object
      required: [title, author]
      properties:
        title:  { type: string, minLength: 1 }
        author: { type: string, minLength: 1 }
```

### `specs/review.openapi.yaml` (ย่อ)

```yaml
openapi: 3.1.0
info: { title: Review API, version: 1.0.0 }
paths:
  /books/{bookId}/reviews:
    get:
      operationId: getReviewsByBook
      parameters:
        - { name: bookId, in: path, required: true, schema: { type: integer } }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Review' }
    post:
      operationId: createReview
      parameters:
        - { name: bookId, in: path, required: true, schema: { type: integer } }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateReviewRequest' }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Review' }
  /reviews/{id}:
    put:
      operationId: updateReview
      parameters:
        - { name: id, in: path, required: true, schema: { type: integer } }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateReviewRequest' }
      responses:
        '200': { description: OK }
    delete:
      operationId: deleteReview
      parameters:
        - { name: id, in: path, required: true, schema: { type: integer } }
      responses:
        '200': { description: Deleted }
components:
  schemas:
    Review:
      type: object
      required: [id, rating, content, bookId]
      properties:
        id:      { type: integer }
        rating:  { type: integer, minimum: 1, maximum: 5 }
        content: { type: string }
        bookId:  { type: integer }
    CreateReviewRequest:
      type: object
      required: [rating, content]
      properties:
        rating:  { type: integer, minimum: 1, maximum: 5 }
        content: { type: string, minLength: 1 }
```

`minimum/maximum` จะถูกแปลงเป็น `@Min(1) @Max(5)` ให้

### `specs/tag.openapi.yaml`

ทำแบบเดียวกัน: `/tags` (GET, POST) และ `/tags/{id}` (PUT, DELETE) โดย schema `Tag` มี `id`, `name`

---

## 6. สั่ง gen

```bash
npx openapi-generate                                   # default: ./specs → ./src/generated
npx openapi-generate --specs ./specs --output ./src/generated
npx openapi-generate --watch                           # แก้ spec แล้ว gen ใหม่เอง
npx openapi-generate --config ./openapi.config.js      # ใช้ไฟล์ config
```

| Option | Alias | ความหมาย | Default |
|---|---|---|---|
| `--config` | `-c` | ไฟล์ config | `openapi.config.js` |
| `--specs` | `-s` | โฟลเดอร์ spec | `./specs` |
| `--output` | `-o` | โฟลเดอร์ผลลัพธ์ | `./src/generated` |
| `--watch` | `-w` | gen ใหม่เมื่อ spec เปลี่ยน | `false` |

### (ตัวเลือก) `openapi.config.js`

```js
module.exports = {
  specsDir: './specs',
  outputDir: './src/generated',
  generateControllers: true,
  generateDtos: true,
  generateTypes: true,
  generatorOptions: {
    useSingleRequestParameter: false,
    includeErrorTypesInReturnType: false,
  },
};
```

### ผลลัพธ์

```
src/generated/
├── book/
│   ├── book.controller.base.ts
│   └── book.dto.ts
├── review/
│   ├── review.controller.base.ts
│   └── review.dto.ts
└── tag/
    ├── tag.controller.base.ts
    └── tag.dto.ts
```

ตัวอย่าง `book.controller.base.ts` (ย่อ):

```ts
@ApiTags('books')
export abstract class BookControllerBase {
  @Get('/books')
  @ApiResponse({ status: 200, type: [BookDto] })
  _getBooks(): Promise<BookDto[]> { return this.getBooks(); }
  abstract getBooks(): Promise<BookDto[]>;

  @Get('/books/:id')
  _getBookById(@Param('id') id: number): Promise<BookDto> { return this.getBookById(id); }
  abstract getBookById(id: number): Promise<BookDto>;

  @Post('/books')
  _createBook(@Body() body: CreateBookRequestDto): Promise<BookDto> { return this.createBook(body); }
  abstract createBook(body: CreateBookRequestDto): Promise<BookDto>;
  // updateBook, deleteBook ...
}
```

> ชื่อ DTO จริง (`BookDto` หรือ `Book`) ให้เปิดไฟล์ที่ gen ออกมาดูอีกครั้ง เพราะตัวอย่างใน README ใช้ปนกัน

---

## 7. เขียนส่วนที่เหลือ (extend)

### Entities (เขียนเอง generator ไม่สร้างให้)

```ts
// books/book.entity.ts
@Entity()
export class Book {
  @PrimaryGeneratedColumn() id: number;
  @Column() title: string;
  @Column() author: string;
  @CreateDateColumn() publishedAt: Date;
  @Column({ type: 'varchar', nullable: true }) coverUrl: string | null;
  @OneToMany(() => Review, (r) => r.book) reviews: Review[];
  @ManyToMany(() => Tag, (t) => t.books)   // ไม่ใส่ cascade
  @JoinTable()                              // ใส่ฝั่งเดียว
  tags: Tag[];
}

// reviews/review.entity.ts
@Entity()
export class Review {
  @PrimaryGeneratedColumn() id: number;
  @Column() rating: number;
  @Column() content: string;
  @Column() bookId: number;
  @ManyToOne(() => Book, (b) => b.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookId' })
  book: Book;
}

// tags/tag.entity.ts
@Entity()
export class Tag {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) name: string;
  @ManyToMany(() => Book, (b) => b.tags) books: Book[];
}
```

### Controller ที่ extend base

```ts
// books/books.controller.ts
import { Controller } from '@nestjs/common';
import { BookControllerBase } from '../generated/book/book.controller.base';
import { CreateBookRequestDto } from '../generated/book/book.dto';
import { BooksService } from './books.service';

@Controller()   // ว่างไว้ เพราะ path เต็ม '/books' อยู่ใน base แล้ว
export class BooksController extends BookControllerBase {
  constructor(private readonly books: BooksService) { super(); }

  getBooks()                              { return this.books.findAll(); }
  getBookById(id: number)                 { return this.books.findOne(+id); }
  createBook(body: CreateBookRequestDto)  { return this.books.create(body); }
  updateBook(id: number, body: CreateBookRequestDto) { return this.books.update(+id, body); }
  deleteBook(id: number)                  { return this.books.remove(+id); }
}
```

- ใส่ `+id` กันกรณีค่าเป็น string
- ลงทะเบียน `controllers: [BooksController]` ใน module
- Service ใช้ของเดิม (Repository + `relations: ['tags']`)

### `main.ts`

```ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: 'http://localhost:3000' });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  const doc = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('Book API').build());
  SwaggerModule.setup('docs', app, doc);   // http://localhost:3001/docs

  await app.listen(3001);
}
bootstrap();
```

`tsconfig.json` ต้อง include โฟลเดอร์ generated:

```json
{ "include": ["src/**/*", "src/generated/**/*"] }
```

---

## 8. อัพโหลดไฟล์ (จุดที่ generator ช่วยไม่ได้)

README ไม่ได้พูดถึง `multipart/form-data` และ base controller ใช้ `@Body()` ธรรมดา ถ้าไปเติม `FileInterceptor` ในไฟล์ base จะ **ถูกเขียนทับเมื่อ gen ใหม่**

**ทางที่แนะนำ:** ให้ generated controller ดูแล GET / DELETE / Review / Tag ส่วน **POST/PUT book ที่มีไฟล์ เขียน controller แยกเอง** (ใช้ path ที่ไม่ชนกับ base หรือเอา operation นั้นออกจาก spec)

```ts
// books/books-upload.controller.ts
@Controller('books')
export class BooksUploadController {
  constructor(private readonly books: BooksService) {}

  @Post()
  @UseInterceptors(FileInterceptor('cover', uploadOptions))
  create(@Body() dto: CreateBookDto, @UploadedFile() file?: Express.Multer.File) {
    return this.books.create(dto, file);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('cover', uploadOptions))
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBookDto,
         @UploadedFile() file?: Express.Multer.File) {
    return this.books.update(id, dto, file);
  }
}
```

ถ้าให้ gen ครอบคลุม POST/PUT ด้วย จะเกิดสอง route ชนกัน ให้ลบ operation `createBook`/`updateBook` ออกจาก spec ที่ใช้ gen หรือไม่ implement route ซ้ำ

อย่าลืม:

- `name="cover"` ใน input ต้องตรงกับ `FileInterceptor('cover')`
- ห้ามตั้ง header `Content-Type` เองตอน fetch FormData
- `@Transform` สำหรับ `tagIds` (multipart ส่งมาเป็น string)

---

## 9. ตัวอย่างข้อมูลสำหรับทดสอบ

```bash
# สร้างหนังสือ
curl -X POST http://localhost:3001/books \
  -H "Content-Type: application/json" \
  -d '{"title":"Clean Code","author":"Robert C. Martin"}'
# → {"id":1,"title":"Clean Code","author":"Robert C. Martin",
#    "publishedAt":"2026-11-03T10:00:00.000Z","coverUrl":null}

# validation: title ว่าง → ต้องได้ 400
curl -X POST http://localhost:3001/books \
  -H "Content-Type: application/json" \
  -d '{"title":"","author":"X"}'

# รีวิว
curl -X POST http://localhost:3001/books/1/reviews \
  -H "Content-Type: application/json" \
  -d '{"rating":5,"content":"อ่านสนุกมาก"}'

# rating เกินช่วง → ต้องได้ 400
curl -X POST http://localhost:3001/books/1/reviews \
  -H "Content-Type: application/json" \
  -d '{"rating":9,"content":"x"}'

# อัพโหลดปก
curl -X POST http://localhost:3001/books \
  -F "title=Refactoring" -F "author=Martin Fowler" \
  -F "cover=@./cover.jpg" -F "tagIds=1" -F "tagIds=2"

# ลบหนังสือ → review หายตาม (cascade), tag ยังอยู่
curl -X DELETE http://localhost:3001/books/1
```

---

## 10. Troubleshooting

| อาการ | วิธีแก้ |
|---|---|
| `Cannot find module` | `npm i @nestjs/common @nestjs/swagger class-validator class-transformer` |
| Validation ไม่ทำงาน | ต้องมี `app.useGlobalPipes(new ValidationPipe(...))` |
| ไฟล์ gen ไม่อัพเดต | `rm -rf src/generated && npx openapi-generate` |
| TypeScript error ใน generated | เช็ค `include` ใน `tsconfig.json` |
| parse spec ไม่ผ่าน | เป็น Swagger 2.0 / 3.0 → แก้เป็น `openapi: 3.1.0` หรือแปลงด้วย editor.swagger.io |
| ชื่อ method แปลก/ซ้ำ | ตรวจ `operationId` ใน spec ต้องไม่ว่างและไม่ซ้ำ |
| ต้องดู log | `DEBUG=openapi-generator npx openapi-generate` |
| route ชนกัน | อย่า implement route เดียวกันทั้งใน generated และ controller เขียนเอง |
| `id` เป็น string | ใช้ `+id` หรือเปิด `transform: true` |

---

## 11. แผนสำรองถ้า generator ใช้ไม่ได้

เป็นแพ็กเกจเล็ก อาจมีบั๊ก ใช้ spec เป็น **checklist** แล้วเขียนเอง:

- ทุก `operationId` → 1 method ใน controller
- ทุก path + method → 1 decorator route (`{id}` → `:id`)
- ทุก `required` → `@IsNotEmpty()`
- `minLength` → `@MinLength()`, `minimum/maximum` → `@Min()/@Max()`
- ทุก `schema` ใน `components` → 1 DTO

ฝั่ง frontend gen type จาก spec ได้ฟรี:

```bash
npx openapi-typescript specs/book.openapi.yaml -o src/api-types.ts
```

---

## 12. Checklist วันสอบ

1. `nest new backend` + ติดตั้ง dependency (หัวข้อ 2)
2. วาง spec ใน `specs/` ตั้งชื่อ `*.openapi.yaml`
3. ถ้า spec ไม่ใช่ 3.1 แก้ `openapi: 3.1.0`
4. `npx openapi-generate`
5. เขียน entity (Book, Review, Tag) + `TypeOrmModule.forRoot({ type: 'sqlite', database: 'dev.db', synchronize: true })`
6. เขียน service + controller ที่ `extends ...ControllerBase`
7. เขียน controller อัพโหลดแยก + multer config (limit 2MB, jpg/png/webp)
8. ลงทะเบียน module, เปิด CORS, ValidationPipe, Swagger UI
9. ทดสอบผ่าน `/docs`: CRUD ทุก entity, validation (400), cascade ลบ Book → Review หาย, Tag ไม่หาย
10. ต่อ frontend Next.js (`NEXT_PUBLIC_API=http://localhost:3001`)

### จุดที่มักโดนหักคะแนน

- ลบ Book แล้ว Review ค้าง (`onDelete: 'CASCADE'`)
- ลบ Book แล้วไฟล์ปกค้างในโฟลเดอร์ (`unlink`)
- แก้ไขโดยไม่ส่งไฟล์ใหม่ ต้องคงปกเดิม
- rating ไม่จำกัด 1–5
- ลบ Book แล้ว Tag หายไปด้วย (ต้องไม่ใส่ cascade ฝั่ง Tag)
- ใส่ `@JoinTable()` สองฝั่ง
- ลืม `relations: ['tags']` ทำให้ response ไม่มี tags
