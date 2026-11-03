// src/books/books.service.ts
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

  // รายการหนังสือ + tag ของแต่ละเล่ม (relations ต้องระบุเอง ไม่งั้น tags จะไม่ติดมา)
  findAll() {
    return this.repo.find({ relations: { tags: true }, order: { id: 'DESC' } });
  }

  // รายละเอียดหนังสือ + tags + reviews (รีวิวใหม่สุดก่อน)
  async findOne(id: number) {
    const book = await this.repo.findOne({
      where: { id },
      relations: { tags: true, reviews: true },
      order: { reviews: { id: 'DESC' } },
    });
    if (!book) throw new NotFoundException('ไม่พบหนังสือ');
    return book;
  }

  // แปลง tagIds → entity Tag  (ถ้ามี id ที่ไม่มีอยู่จริงให้ error)
  private async loadTags(tagIds: number[] = []) {
    if (tagIds.length === 0) return [];
    const unique = [...new Set(tagIds)];
    const tags = await this.tagRepo.findBy({ id: In(unique) });
    if (tags.length !== unique.length) throw new BadRequestException('มี tagId ที่ไม่ถูกต้อง');
    return tags;
  }

  async create(dto: CreateBookDto, file?: Express.Multer.File) {
    const coverUrl = file ? buildFileUrl('covers', file.filename) : null;
    const { tagIds, ...data } = dto; // แยก tagIds ออก เพราะ entity ไม่มี field นี้
    try {
      const tags = await this.loadTags(tagIds);
      return await this.repo.save(this.repo.create({ ...data, tags, coverUrl }));
    } catch (e) {
      // multer เขียนไฟล์ลงดิสก์ไปแล้วก่อนถึงตรงนี้ ถ้าบันทึกไม่สำเร็จต้องลบไฟล์ทิ้ง ไม่ให้ค้าง
      deleteUploadedFile(coverUrl);
      throw e;
    }
  }

  async update(id: number, dto: UpdateBookDto, file?: Express.Multer.File) {
    const newUrl = file ? buildFileUrl('covers', file.filename) : null;
    try {
      const book = await this.findOne(id);
      const { tagIds, ...data } = dto;
      Object.assign(book, data); // อัปเดต title/author ที่ส่งมา

      // tagIds === undefined → ไม่ได้ส่งมา = คง tag เดิม
      // tagIds เป็น []        → ล้าง tag ทั้งหมด
      if (tagIds !== undefined) book.tags = await this.loadTags(tagIds);

      const oldUrl = book.coverUrl;
      if (newUrl) book.coverUrl = newUrl; // ไม่ส่งไฟล์ใหม่ = คงปกเดิม

      const saved = await this.repo.save(book);
      if (newUrl) deleteUploadedFile(oldUrl); // ลบปกเก่า "หลัง" บันทึกสำเร็จเท่านั้น
      return saved;
    } catch (e) {
      deleteUploadedFile(newUrl); // บันทึกไม่สำเร็จ → ลบไฟล์ใหม่ที่เพิ่งอัปโหลด
      throw e;
    }
  }

  async remove(id: number) {
    const book = await this.findOne(id); // รวม reviews มาด้วย

    // เก็บ path ไฟล์ทั้งหมดไว้ก่อนลบ: ปกหนังสือ + รูปรีวิวทุกอัน
    const files = [book.coverUrl, ...book.reviews.map((r) => r.imageUrl)];

    // delete(id) → DB ทำ cascade เอง: Review หายตาม, แถวตารางกลางหาย, Tag ยังอยู่
    await this.repo.delete(id);

    // DB cascade ลบแค่ "แถว" ไม่ลบ "ไฟล์" จึงต้องลบไฟล์เอง
    files.forEach((url) => deleteUploadedFile(url));
    return { deleted: true };
  }
}

