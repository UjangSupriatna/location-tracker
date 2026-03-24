import { NextResponse } from 'next/server';
import { API_ENDPOINTS, API_KEY_PUBLIC, API_KEY_PRIVATE } from '@/lib/api';
import { getAuthUser } from '@/lib/auth-server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const url = new URL(request.url);
    const isHistory = url.searchParams.get('history') === 'true';

    // For history, use private key and get_locations endpoint
    if (isHistory) {
      const user = await getAuthUser();
      if (!user) {
        return NextResponse.json(
          { status: false, message: 'Unauthorized' },
          { status: 401 }
        );
      }

      const response = await fetch(`${API_ENDPOINTS.getLocations}?token=${token}&api_key=${API_KEY_PRIVATE}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.status) {
        return NextResponse.json(
          { status: false, message: data.message || 'Session not found' },
          { status: 404 }
        );
      }

      // PHP response: { status, message, data: [{ id, session_id, latitude, longitude, accuracy, created_at }] }
      const locations = (data.data || []).map((loc: Record<string, unknown>) => ({
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
        timestamp: loc.created_at,
      }));

      return NextResponse.json({
        success: true,
        locations,
      });
    }

    // For session info, use public key and get_session endpoint
    const response = await fetch(`${API_ENDPOINTS.getSession}?token=${token}&api_key=${API_KEY_PUBLIC}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      return NextResponse.json(
        { status: false, message: data.message || 'Session not found' },
        { status: 404 }
      );
    }

    // PHP response: { status, message, data: { id, token, target_name, expire_at, is_active } }
    const sessionData = data.data;

    // Get locations history for this session
    const historyResponse = await fetch(`${API_ENDPOINTS.getLocations}?token=${token}&api_key=${API_KEY_PRIVATE}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const historyData = await historyResponse.json();
    const locations = (historyData.data || []).map((loc: Record<string, unknown>) => ({
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracy: loc.accuracy,
      timestamp: loc.created_at,
    }));

    return NextResponse.json({
      success: true,
      session: {
        id: sessionData.id,
        name: sessionData.target_name,
        token: sessionData.token,
        expiresAt: sessionData.expire_at,
        locations,
      },
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { status: false, message: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}
