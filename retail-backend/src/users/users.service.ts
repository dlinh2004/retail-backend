// src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  // Tạo user mới
  async create(username: string, password: string, role: UserRole = UserRole.STAFF) {
  const hashed = await bcrypt.hash(password, 10);
  const user = this.usersRepository.create({
    username,
    password: hashed,
    role,
  });
  return this.usersRepository.save(user);
}

  // Lấy tất cả user
  findAll() {
    return this.usersRepository.find();
  }

  // Lấy user theo ID
  findOne(id: number) {
    return this.usersRepository.findOneBy({ id });
  }

  // Cập nhật thông tin user
  async update(id: number, data: { username?: string; password?: string; role?: UserRole }) {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) return null;

    if (data.username !== undefined) user.username = data.username;
    if (data.role !== undefined) user.role = data.role;

    if (data.password !== undefined && data.password !== null && data.password !== '') {
      const hashed = await bcrypt.hash(data.password, 10);
      user.password = hashed;
    }

    return this.usersRepository.save(user);
  }

  // Xoá user
  async delete(id: number) {
    const res = await this.usersRepository.delete({ id });
    return res.affected && res.affected > 0;
  }

  // Lấy user theo username (cần cho AuthService)
  findByUsername(username: string) {
  return this.usersRepository.findOne({
    where: { username },
  });
}

}
