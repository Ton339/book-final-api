// src/reviews/entities/review.entity.ts
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { Book } from '../../books/entities/book.entity.js';

@Entity()
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  rating: number; // 1-5 (ตรวจใน DTO)

  @Column()
  content: string;

  // รูปประกอบรีวิว (ไม่บังคับ)
  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  // คอลัมน์ FK ที่เข้าถึงเป็นตัวเลขได้ตรงๆ (ใช้ where: { bookId } ได้)
  @Column()
  bookId: number;

  // Many-to-One: รีวิวหลายอันเป็นของหนังสือเล่มเดียว
  // onDelete: 'CASCADE' → ลบ Book แล้ว Review ของเล่มนั้นถูกลบตามที่ระดับ DB
  @ManyToOne(() => Book, (book) => book.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookId' }) // ผูกความสัมพันธ์เข้ากับคอลัมน์ bookId ด้านบน
  book: Relation<Book>;
}
