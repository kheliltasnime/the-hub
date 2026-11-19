import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';

export interface StoredTabletUser {
  userId: string;
  email?: string;
  pinHash: string;
  role: Role;
  deviceId: string;
  enseigneId: string;
  fullName: string;
}

@Injectable()
export class UsersStore {
  private tabletUsers = new Map<string, StoredTabletUser>();

  listTabletUsers(): StoredTabletUser[] {
    return Array.from(this.tabletUsers.values());
  }

  createTabletUser(user: StoredTabletUser): void {
    this.tabletUsers.set(user.userId, user);
  }
}