import type { Role } from '@prisma/client';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  storeId: string | null;
};

export type AppVariables = {
  user: AuthUser;
};
