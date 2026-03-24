import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getAuthUser } from '@/lib/auth-server';

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required', success: false },
        { status: 400 }
      );
    }

    // Generate unique token
    const token = randomBytes(16).toString('hex');
    
    // Set expiration to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Create or update user in database
    let dbUser = await db.user.findUnique({
      where: { googleId: user.googleId || '' },
    });

    if (!dbUser) {
      dbUser = await db.user.create({
        data: {
          googleId: user.googleId || '',
          email: user.email,
          name: user.name,
          image: user.image,
          roleId: user.roleId || 3,
          externalId: user.externalId,
        },
      });
    } else {
      // Update user info
      dbUser = await db.user.update({
        where: { id: dbUser.id },
        data: {
          name: user.name,
          image: user.image,
          roleId: user.roleId || dbUser.roleId,
          externalId: user.externalId,
        },
      });
    }

    const session = await db.trackingSession.create({
      data: {
        name: name.trim(),
        token,
        expiresAt,
        isActive: true,
        userId: dbUser.id,
      },
    });

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        name: session.name,
        token: session.token,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    console.error('Error creating tracking session:', error);
    return NextResponse.json(
      { error: 'Failed to create tracking session', success: false },
      { status: 500 }
    );
  }
}
