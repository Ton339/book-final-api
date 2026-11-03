// src/seed/seed.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { UPLOAD_ROOT } from '../common/upload.util.js';
import { Tag } from '../tags/entities/tag.entity.js';
import { Book } from '../books/entities/book.entity.js';
import { Review } from '../reviews/entities/review.entity.js';

// Base64 1x1 PNG สำหรับสร้างรูปภาพตัวอย่าง
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

    // 1. เคลียร์ข้อมูลเก่าตามลำดับ Foreign Key: Review -> Book (และตารางกลาง) -> Tag
    await this.reviewRepo.createQueryBuilder().delete().execute();
    await this.bookRepo.createQueryBuilder().delete().execute();
    await this.tagRepo.createQueryBuilder().delete().execute();

    // 2. สร้าง Tags ตัวอย่าง
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

    // 3. สร้าง Books พร้อมไฟล์รูปปก
    const cover1 = this.createSampleFile('covers', `seed-clean-code-${Date.now()}.png`);
    const book1 = await this.bookRepo.save(
      this.bookRepo.create({
        title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
        author: 'Robert C. Martin',
        coverUrl: cover1,
        tags: [
          tagMap.get('Programming')!,
          tagMap.get('Clean Architecture')!,
          tagMap.get('Classic')!,
        ],
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

    // 4. สร้าง Reviews พร้อมไฟล์ภาพประกอบ
    const reviewImg1 = this.createSampleFile('reviews', `seed-review-1-${Date.now()}.png`);
    const reviewImg2 = this.createSampleFile('reviews', `seed-review-2-${Date.now()}.png`);

    const createdReviews = await this.reviewRepo.save([
      this.reviewRepo.create({
        bookId: book1.id,
        rating: 5,
        content: 'เล่มนี้สอนหลักการเขียนโค้ดให้อ่านง่าย สื่อความหมาย และลดหนี้ทางเทคนิค ปรับใช้กับงานจริงได้ดีมาก',
        imageUrl: reviewImg1,
      }),
      this.reviewRepo.create({
        bookId: book1.id,
        rating: 4,
        content: 'เนื้อหาแน่นมาก แม้ตัวอย่างจะเป็น Java แต่ Concept ใช้ได้กับทุกภาษาที่รองรับ OOP ครับ',
        imageUrl: null,
      }),
      this.reviewRepo.create({
        bookId: book2.id,
        rating: 5,
        content: 'แนะนําให้นักพัฒนาทุกคนอ่าน ช่วยเปิดมุมมองวิธีคิด และการแก้ปัญหาในสถานการณ์จริงได้อย่างมีประสิทธิภาพ',
        imageUrl: reviewImg2,
      }),
      this.reviewRepo.create({
        bookId: book3.id,
        rating: 5,
        content: 'คัมภีร์ระดับตำนานสำหรับระบบ Backend และ Distributed Systems อธิบายลึกซึ้งทั้ง Partitioning, Replication และ Consensus',
        imageUrl: null,
      }),
      this.reviewRepo.create({
        bookId: book4.id,
        rating: 5,
        content: 'อ่านจบในวันเดียว เล่มเล็กแต่อัดแน่นด้วยหลักคิด UX/UI ที่ practical ที่สุดสำหรับเว็บแอป',
        imageUrl: null,
      }),
    ]);

    this.logger.log('🎉 Seeding completed successfully!');

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

