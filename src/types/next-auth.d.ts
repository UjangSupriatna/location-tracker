import NextAuth from 'next-auth';
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      googleId?: string;
      roleId?: number;
      externalId?: number;
    } & DefaultSession['user'];
  }

  interface User {
    googleId?: string;
    roleId?: number;
    externalId?: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    googleId?: string;
    roleId?: number;
    externalId?: number;
  }
}
