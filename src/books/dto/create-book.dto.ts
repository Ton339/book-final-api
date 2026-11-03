// src/books/dto/create-book.dto.ts
import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBookDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  author: string;

  // ข้อมูลจาก multipart/form-data ทุกค่าเป็น string
  //  - ส่ง tagIds ตัวเดียว → ได้ "1" (ไม่ใช่ array)
  //  - ส่งหลายตัว         → ได้ ["1","2"]
  //  - ส่งค่าว่าง ""       → หมายถึง "ไม่มี tag"
  // @Transform แปลงทุกกรณีให้เป็น number[] ก่อนตรวจ @IsInt({ each: true })
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value == null ? [] : ([] as unknown[]).concat(value).map(Number),
  )
  @IsInt({ each: true })
  tagIds?: number[];
}

