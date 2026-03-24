import { NextResponse } from 'next/server';
import { getAuthUser, isAdmin } from '@/lib/auth-server';
import { API_ENDPOINTS, API_KEY_PRIVATE } from '@/lib/api';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    const { token } = await params;

    // Call external API to delete session
    // Note: You may need to provide the actual delete endpoint
    const response = await fetch(`${API_ENDPOINTS.getSession}?token=${token}&api_key=${API_KEY_PRIVATE}&delete=1`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Failed to delete session', success: false },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { error: 'Failed to delete session', success: false },
      { status: 500 }
    );
  }
}
