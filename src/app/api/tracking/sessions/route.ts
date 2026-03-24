import { NextResponse } from 'next/server';
import { getAuthUser, isAdmin } from '@/lib/auth-server';
import { API_ENDPOINTS, API_KEY_PRIVATE } from '@/lib/api';

export async function GET() {
  try {
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json(
        { status: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Call external API to get all sessions
    const response = await fetch(`${API_ENDPOINTS.getAllSessions}?api_key=${API_KEY_PRIVATE}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      return NextResponse.json(
        { status: false, message: data.message || 'Failed to fetch sessions' },
        { status: response.status }
      );
    }

    // PHP response: { status, message, data: [{ id, token, target_name, expire_at, is_active, last_location, last_online }] }
    const sessions = (data.data || []).map((session: Record<string, unknown>) => {
      const lastLocation = session.last_location as Record<string, unknown> | null;
      const lastOnline = session.last_online as string | null;
      
      return {
        id: session.id,
        name: session.target_name,
        token: session.token,
        isActive: session.is_active === 1 || session.is_active === true,
        lastOnline: lastOnline,
        createdAt: session.created_at || new Date(),
        expiresAt: session.expire_at,
        isOnline: lastOnline ? (new Date().getTime() - new Date(lastOnline).getTime()) < 30000 : false,
        lastLocation: lastLocation ? {
          latitude: lastLocation.latitude as number,
          longitude: lastLocation.longitude as number,
          accuracy: lastLocation.accuracy as number | undefined,
          timestamp: lastLocation.created_at as string,
        } : null,
      };
    });

    return NextResponse.json({
      success: true,
      sessions: sessions,
      user: {
        roleId: user.roleId,
        isAdmin: isAdmin(user.roleId),
      },
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { status: false, message: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
