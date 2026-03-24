import { NextResponse } from 'next/server';
import { getAuthUser, isAdmin } from '@/lib/auth-server';
import { API_ENDPOINTS, API_KEY_PRIVATE, API_KEY_PUBLIC } from '@/lib/api';

export async function GET() {
  try {
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    // Call external API to get sessions
    const response = await fetch(`${API_ENDPOINTS.getSession}?api_key=${API_KEY_PRIVATE}&user_google_id=${user.googleId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Failed to fetch sessions', success: false },
        { status: response.status }
      );
    }

    // Format sessions
    const sessions = (data.data || data.sessions || []).map((session: Record<string, unknown>) => {
      const lastLocation = session.last_location || session.lastLocation;
      const lastOnline = session.last_online || session.lastOnline;
      
      return {
        id: session.id || session.token,
        name: session.name,
        token: session.token,
        isActive: session.is_active ?? session.isActive ?? true,
        lastOnline: lastOnline ? new Date(lastOnline as string) : null,
        createdAt: session.created_at || session.createdAt || new Date(),
        expiresAt: session.expires_at || session.expiresAt,
        isOnline: lastOnline ? (new Date().getTime() - new Date(lastOnline as string).getTime()) < 30000 : false,
        lastLocation: lastLocation ? {
          latitude: (lastLocation as Record<string, number>).latitude,
          longitude: (lastLocation as Record<string, number>).longitude,
          accuracy: (lastLocation as Record<string, number>).accuracy,
          timestamp: (lastLocation as Record<string, string>).timestamp || new Date(),
        } : null,
      };
    });

    // Filter by user if not admin
    const filteredSessions = isAdmin(user.roleId) 
      ? sessions 
      : sessions.filter((s: { userId?: string }) => !s.userId || s.userId === user.googleId);

    return NextResponse.json({
      success: true,
      sessions: filteredSessions,
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
