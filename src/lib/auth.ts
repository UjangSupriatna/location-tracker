import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

// API endpoint for external login
const EXTERNAL_API_URL = 'https://admin.itsacademics.com/api/login_google';
const API_KEY = 'ITSACAD_LOGIN_7HjK29sPd';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Call external API to sync user data
      if (account?.provider === 'google' && user.email) {
        try {
          const response = await fetch(`${EXTERNAL_API_URL}?api_key=${API_KEY}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              google_id: account.providerAccountId,
              name: user.name,
              email: user.email,
              profile_picture: user.image,
              is_google_user: 1,
              is_active: 1,
              role_id: 3,
              date_created: Math.floor(Date.now() / 1000),
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const userData = data.data || data;
            // Store external data in user object
            user.googleId = account.providerAccountId;
            user.roleId = userData.role_id || 3;
            user.externalId = userData.id;
            return true;
          }
          
          // Still allow sign in even if API fails
          user.googleId = account.providerAccountId;
          user.roleId = 3;
          return true;
        } catch (error) {
          console.error('Error calling external API:', error);
          user.googleId = account.providerAccountId;
          user.roleId = 3;
          return true;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.googleId = user.googleId as string;
        token.roleId = user.roleId as number;
        token.externalId = user.externalId as number | undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.googleId = token.googleId as string;
        session.user.roleId = token.roleId as number;
        session.user.externalId = token.externalId as number | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
