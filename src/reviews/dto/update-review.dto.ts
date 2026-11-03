// src/reviews/dto/update-review.dto.ts
import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateReviewDto } from './create-review.dto.js';

// แก้รีวิวได้เฉพาะ rating/content/image — ห้ามย้ายรีวิวไปหนังสือเล่มอื่น (ตัด bookId ออก)
export class UpdateReviewDto extends PartialType(OmitType(CreateReviewDto, ['bookId'] as const)) {}

