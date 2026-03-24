import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-server';
import { API_ENDPOINTS, API_KEY_PRIVATE } from '@/lib/api';

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json(
        { status: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { status: false, message: 'target_name wajib' },
        { status: 400 }
      );
    }

    // Call external API to create session
    // PHP API expects: target_name, expire_at (optional)
    const response = await fetch(`${API_ENDPOINTS.createSession}?api_key=${API_KEY_PRIVATE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_name: name.trim(),
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      return NextResponse.json(
        { status: false, message: data.message || 'Failed to create session' },
        { status: response.status }
      );
    }

    // PHP response: { status, message, data: { token, target_name, expire_at, is_active } }
    const sessionData = data.data;

    return NextResponse.json({
      success: true,
      session: {
        id: sessionData.id || sessionData.token,
        name: sessionData.target_name,
        token: sessionData.token,
        expiresAt: sessionData.expire_at,
      },
    });
  } catch (error) {
    console.error('Error creating tracking session:', error);
    return NextResponse.json(
      { status: false, message: 'Failed to create tracking session' },
      { status: 500 }
    );
  }
}
