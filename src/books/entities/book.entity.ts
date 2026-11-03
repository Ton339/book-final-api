// src/books/entities/book.entity.ts
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

  // CreateDateColumn = ใส่วันเวลาปัจจุบันให้อัตโนมัติตอนสร้าง (เทียบเท่า @default(now()))
  @CreateDateColumn()
  publishedAt: Date;

  // nullable = ไม่บังคับมีปก
  // ต้องระบุ type: 'varchar' เอง เพราะ TypeScript type "string | null" TypeORM อ่านชนิดไม่ออก
  @Column({ type: 'varchar', nullable: true })
  coverUrl: string | null;

  // One-to-Many: หนังสือ 1 เล่มมีหลายรีวิว (ฝั่ง FK อยู่ที่ Review.bookId)
  @OneToMany(() => Review, (review) => review.book)
  reviews: Relation<Review>[];

  // Many-to-Many: ไม่ใส่ cascade → ลบหนังสือแล้ว Tag ไม่หาย
  // @JoinTable() ใส่ "ฝั่งเดียว" (ฝั่งเจ้าของ) เพื่อสร้างตารางกลาง book_tags_tag
  @ManyToMany(() => Tag, (tag) => tag.books)
  @JoinTable()
  tags: Relation<Tag>[];
}
