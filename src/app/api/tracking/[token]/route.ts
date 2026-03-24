import { NextResponse } from 'next/server';
import { API_ENDPOINTS, API_KEY_PUBLIC } from '@/lib/api';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Call external API to get session
    const response = await fetch(`${API_ENDPOINTS.getSession}?token=${token}&api_key=${API_KEY_PUBLIC}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Session not found', success: false },
        { status: 404 }
      );
    }

    const sessionData = data.data || data.session || data;
    const locations = (data.locations || sessionData.locations || []).map((loc: Record<string, unknown>) => ({
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracy: loc.accuracy,
      timestamp: loc.timestamp || loc.created_at,
    }));

    return NextResponse.json({
      success: true,
      session: {
        id: sessionData.id || sessionData.token,
        name: sessionData.name,
        token: sessionData.token,
        expiresAt: sessionData.expires_at || sessionData.expiresAt,
        locations,
      },
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session', success: false },
      { status: 500 }
    );
  }
}
