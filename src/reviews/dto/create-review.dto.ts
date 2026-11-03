// src/reviews/dto/create-review.dto.ts
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  // multipart ส่งตัวเลขมาเป็น string → @Type(() => Number) แปลงเป็น number ก่อนตรวจ
  @Type(() => Number)
  @IsInt()
  bookId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1) // โจทย์: rating ต้อง 1-5
  @Max(5)
  rating: number;

  @IsString()
  @IsNotEmpty()
  content: string;

  // รูปรีวิวไม่ต้องประกาศใน DTO: multer จัดการแยก แล้วส่งให้ controller ผ่าน @UploadedFile()
}

