import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import type { DrizzleDb } from '../../database/database.types';
import { users } from '../../database/schema';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  isSuperAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async findAll(): Promise<PublicUser[]> {
    const rows = await this.db.select().from(users);
    return rows.map((row) => this.toPublicUser(row));
  }

  async findOne(id: string): Promise<PublicUser> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toPublicUser(user);
  }

  async create(dto: CreateUserDto): Promise<PublicUser> {
    const email = dto.email.toLowerCase();
    const [existing] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await argon2.hash(dto.password);
    const [created] = await this.db
      .insert(users)
      .values({
        email,
        passwordHash,
        name: dto.name,
        isSuperAdmin: dto.isSuperAdmin ?? false,
      })
      .returning();
    return this.toPublicUser(created);
  }

  async update(id: string, dto: UpdateUserDto): Promise<PublicUser> {
    await this.findOne(id);

    const patch: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.isSuperAdmin !== undefined) patch.isSuperAdmin = dto.isSuperAdmin;
    if (dto.password !== undefined)
      patch.passwordHash = await argon2.hash(dto.password);

    const [updated] = await this.db
      .update(users)
      .set(patch)
      .where(eq(users.id, id))
      .returning();
    return this.toPublicUser(updated);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.delete(users).where(eq(users.id, id));
    return { success: true };
  }

  private toPublicUser(user: typeof users.$inferSelect): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isSuperAdmin: user.isSuperAdmin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
