import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-server';
import { API_ENDPOINTS, API_KEY_PRIVATE } from '@/lib/api';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json(
        { status: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { token } = await params;

    // Call external API to delete session
    const response = await fetch(`${API_ENDPOINTS.deleteSession}?token=${token}&api_key=${API_KEY_PRIVATE}`, {
      method: 'GET', // PHP uses GET for delete based on typical CodeIgniter pattern
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      return NextResponse.json(
        { status: false, message: data.message || 'Failed to delete session' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Session dihapus',
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { status: false, message: 'Failed to delete session' },
      { status: 500 }
    );
  }
}
