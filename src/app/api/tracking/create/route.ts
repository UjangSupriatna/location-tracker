import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-server';
import { API_ENDPOINTS, API_KEY_PRIVATE } from '@/lib/api';

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

    // Call external API to create session
    const response = await fetch(`${API_ENDPOINTS.createSession}?api_key=${API_KEY_PRIVATE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name.trim(),
        user_google_id: user.googleId,
        user_email: user.email,
        user_name: user.name,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Failed to create session', success: false },
        { status: response.status }
      );
    }

    const sessionData = data.data || data.session || data;

    return NextResponse.json({
      success: true,
      session: {
        id: sessionData.id || sessionData.token,
        name: sessionData.name,
        token: sessionData.token,
        expiresAt: sessionData.expires_at || sessionData.expiresAt,
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
