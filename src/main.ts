// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // เปิด CORS ให้ frontend (Next.js ที่ port 3000) เรียก API ได้
  app.enableCors({ origin: 'http://localhost:3000' });

  // ValidationPipe = ตรวจข้อมูลตาม decorator ใน DTO (@IsString, @Min ฯลฯ)
  //  whitelist: true  → ตัด field ที่ไม่มีใน DTO ทิ้ง
  //  transform: true  → แปลงข้อมูลเป็นชนิดตาม DTO
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Swagger UI ที่ http://localhost:3001/docs (JSON ที่ /docs-json)
  const config = new DocumentBuilder()
    .setTitle('Book API')
    .setDescription('Book / Review / Tag + อัปโหลดรูป')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger UI is available at: http://localhost:${port}/docs`);
}
await bootstrap();
