import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const session = await db.trackingSession.findUnique({
      where: { token },
      include: {
        locations: {
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Tracking session not found' },
        { status: 404 }
      );
    }

    // Check if expired
    if (session.expiresAt && new Date() > session.expiresAt) {
      return NextResponse.json(
        { error: 'Tracking link has expired' },
        { status: 410 }
      );
    }

    // Update last online
    await db.trackingSession.update({
      where: { token },
      data: { lastOnline: new Date() },
    });

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        name: session.name,
        token: session.token,
        isActive: session.isActive,
        lastOnline: session.lastOnline,
        locations: session.locations,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    console.error('Error fetching tracking session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tracking session' },
      { status: 500 }
    );
  }
}
