import { NextResponse } from 'next/server';
import { API_ENDPOINTS, API_KEY_PUBLIC, API_KEY_PRIVATE } from '@/lib/api';

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
      const response = await fetch(`${API_ENDPOINTS.getLocations}?token=${token}&api_key=${API_KEY_PRIVATE}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.status) {
        return NextResponse.json(
          { success: false, message: data.message || 'Session not found' },
          { status: 404 }
        );
      }

      // PHP response: { status, message, data: [{ id, session_id, latitude, longitude, accuracy, created_at }] }
      const locations = (data.data || []).map((loc: Record<string, unknown>) => ({
        latitude: Number(loc.latitude) || 0,
        longitude: Number(loc.longitude) || 0,
        accuracy: loc.accuracy ? Number(loc.accuracy) : undefined,
        timestamp: String(loc.created_at || new Date()),
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
        { success: false, message: data.message || 'Session not found' },
        { status: 404 }
      );
    }

    // PHP response: { status, message, data: { id, token, target_name, expire_at, is_active, last_location } }
    const sessionData = data.data || {};
    const lastLocation = sessionData.last_location as Record<string, unknown> | null;

    // Convert last_location to locations array for compatibility
    let locations: Array<{
      latitude: number;
      longitude: number;
      accuracy?: number;
      timestamp: string;
    }> = [];

    if (lastLocation && lastLocation.latitude != null && lastLocation.longitude != null) {
      locations = [{
        latitude: Number(lastLocation.latitude) || 0,
        longitude: Number(lastLocation.longitude) || 0,
        accuracy: lastLocation.accuracy ? Number(lastLocation.accuracy) : undefined,
        timestamp: String(lastLocation.created_at || new Date()),
      }];
    }

    return NextResponse.json({
      success: true,
      session: {
        id: sessionData.id || '',
        name: sessionData.target_name || 'Unknown',
        token: sessionData.token || token,
        expiresAt: sessionData.expire_at || null,
        locations,
      },
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}
