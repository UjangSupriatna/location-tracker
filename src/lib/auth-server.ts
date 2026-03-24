import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  googleId?: string;
  roleId?: number;
  externalId?: number;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return null;
  }

  return {
    id: session.user.googleId || '',
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
    googleId: session.user.googleId,
    roleId: session.user.roleId,
    externalId: session.user.externalId,
  };
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}

export function isAdmin(roleId?: number): boolean {
  return roleId === 1;
}
