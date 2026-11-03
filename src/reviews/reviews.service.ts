// src/reviews/reviews.service.ts
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
    @InjectRepository(Book) private readonly bookRepo: Repository<Book>, // ใช้เช็คว่า bookId มีจริง
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
      deleteUploadedFile(imageUrl); // ไฟล์ถูกเซฟไปแล้ว แต่บันทึกไม่ผ่าน → ลบทิ้ง
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
      if (newUrl) review.imageUrl = newUrl; // ไม่ส่งรูปใหม่ = คงรูปเดิม

      const saved = await this.repo.save(review);
      if (newUrl) deleteUploadedFile(oldUrl); // ลบรูปเก่าหลังบันทึกสำเร็จ
      return saved;
    } catch (e) {
      deleteUploadedFile(newUrl); // บันทึกไม่สำเร็จ → ลบไฟล์ใหม่ที่เพิ่งอัปโหลด
      throw e;
    }
  }

  async remove(id: number) {
    const review = await this.findOne(id);
    const imageUrl = review.imageUrl; // จดไว้ก่อน เพราะหลัง remove() entity จะถูกล้างค่า
    await this.repo.remove(review);
    deleteUploadedFile(imageUrl); // ลบไฟล์รูปด้วย
    return { deleted: true };
  }
}

