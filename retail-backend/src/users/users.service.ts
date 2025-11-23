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

  // Lấy user theo username (cần cho AuthService)
  findByUsername(username: string) {
  return this.usersRepository.findOne({
    where: { username },
  });
}

}
