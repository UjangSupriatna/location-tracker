import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getAuthUser, isAdmin } from '@/lib/auth-server';

export async function GET() {
  try {
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    // Build filter based on role
    const whereClause: {
      isActive: boolean;
      OR: Array<{ expiresAt: null } | { expiresAt: { gt: Date } }>;
      userId?: string | null;
    } = {
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    };

    // If not admin, only show user's own sessions
    if (!isAdmin(user.roleId)) {
      whereClause.userId = user.googleId;
    }
    // Admin can see all sessions (no userId filter)

    const sessions = await db.trackingSession.findMany({
      where: whereClause,
      include: {
        locations: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedSessions = sessions.map(session => {
      const lastLocation = session.locations[0];
      const isOnline = session.lastOnline 
        ? (new Date().getTime() - session.lastOnline.getTime()) < 30000 // 30 seconds
        : false;

      return {
        id: session.id,
        name: session.name,
        token: session.token,
        isActive: session.isActive,
        lastOnline: session.lastOnline,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        isOnline,
        userId: session.userId,
        lastLocation: lastLocation ? {
          latitude: lastLocation.latitude,
          longitude: lastLocation.longitude,
          accuracy: lastLocation.accuracy,
          timestamp: lastLocation.timestamp,
        } : null,
      };
    });

    return NextResponse.json({
      success: true,
      sessions: formattedSessions,
      user: {
        roleId: user.roleId,
        isAdmin: isAdmin(user.roleId),
      },
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions', success: false },
      { status: 500 }
    );
  }
}
