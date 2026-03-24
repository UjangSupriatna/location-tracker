import { NextResponse } from 'next/server';
import { getAuthUser, isAdmin } from '@/lib/auth-server';
import { API_ENDPOINTS, API_KEY_PRIVATE } from '@/lib/api';

export async function GET() {
  try {
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Build URL with user info for filtering
    const url = new URL(`${API_ENDPOINTS.getAllSessions}?api_key=${API_KEY_PRIVATE}`);
    url.searchParams.append('user_google_id', user.googleId);
    url.searchParams.append('role_id', user.roleId.toString());

    // Call external API to get all sessions
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to fetch sessions' },
        { status: response.status }
      );
    }

    // PHP response: { status, message, data: [{ id, token, target_name, user_google_id, expire_at, is_active, last_location, last_online }] }
    const sessions = (data.data || []).map((session: Record<string, unknown>) => {
      const lastLocation = session.last_location as Record<string, unknown> | null;
      const lastOnline = session.last_online ? String(session.last_online) : null;
      
      return {
        id: String(session.id || ''),
        name: String(session.target_name || 'Unknown'),
        token: String(session.token || ''),
        userId: session.user_google_id ? String(session.user_google_id) : null,
        isActive: session.is_active === 1 || session.is_active === true,
        lastOnline: lastOnline,
        createdAt: session.created_at ? String(session.created_at) : new Date().toISOString(),
        expiresAt: session.expire_at ? String(session.expire_at) : null,
        isOnline: lastOnline ? (new Date().getTime() - new Date(lastOnline).getTime()) < 30000 : false,
        lastLocation: lastLocation && lastLocation.latitude != null ? {
          latitude: Number(lastLocation.latitude) || 0,
          longitude: Number(lastLocation.longitude) || 0,
          accuracy: lastLocation.accuracy ? Number(lastLocation.accuracy) : undefined,
          timestamp: String(lastLocation.created_at || new Date()),
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
      { success: false, message: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
