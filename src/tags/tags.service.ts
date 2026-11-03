// src/tags/tags.service.ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTagDto } from './dto/create-tag.dto.js';
import { UpdateTagDto } from './dto/update-tag.dto.js';
import { Tag } from './entities/tag.entity.js';

@Injectable()
export class TagsService {
  constructor(@InjectRepository(Tag) private readonly repo: Repository<Tag>) {}

  findAll() {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: number) {
    const tag = await this.repo.findOneBy({ id });
    if (!tag) throw new NotFoundException('ไม่พบ Tag');
    return tag;
  }

  async create(dto: CreateTagDto) {
    if (await this.repo.findOneBy({ name: dto.name })) {
      throw new ConflictException('ชื่อ Tag นี้มีอยู่แล้ว');
    }
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: UpdateTagDto) {
    const tag = await this.findOne(id);
    if (dto.name && dto.name !== tag.name) {
      if (await this.repo.findOneBy({ name: dto.name })) {
        throw new ConflictException('ชื่อ Tag นี้มีอยู่แล้ว');
      }
      tag.name = dto.name;
    }
    return this.repo.save(tag);
  }

  async remove(id: number) {
    const tag = await this.repo.findOne({ where: { id }, relations: { books: true } });
    if (!tag) throw new NotFoundException('ไม่พบ Tag');

    if (tag.books.length > 0) {
      throw new ConflictException(`Tag นี้ยังถูกใช้โดยหนังสือ ${tag.books.length} เล่ม`);
    }
    await this.repo.remove(tag);
    return { deleted: true };
  }
}

