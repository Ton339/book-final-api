// src/tags/entities/tag.entity.ts
import { Column, Entity, ManyToMany, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { Book } from '../../books/entities/book.entity.js';

@Entity()
export class Tag {
  @PrimaryGeneratedColumn()
  id: number;

  // unique = ชื่อ tag ห้ามซ้ำ
  @Column({ unique: true })
  name: string;

  // ฝั่ง "ไม่ใช่เจ้าของ" ของ Many-to-Many (ไม่ใส่ @JoinTable ที่นี่ และไม่ใส่ cascade)
  @ManyToMany(() => Book, (book) => book.tags)
  books: Relation<Book>[];
}
