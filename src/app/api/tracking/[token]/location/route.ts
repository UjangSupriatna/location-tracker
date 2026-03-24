import { NextResponse } from 'next/server';
import { API_ENDPOINTS, API_KEY_PUBLIC } from '@/lib/api';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { latitude, longitude, accuracy } = body;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { status: false, message: 'data tidak lengkap' },
        { status: 400 }
      );
    }

    // Call external API to save location
    // PHP expects: token, latitude, longitude, accuracy
    const response = await fetch(`${API_ENDPOINTS.saveLocation}?api_key=${API_KEY_PUBLIC}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        latitude,
        longitude,
        accuracy,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      return NextResponse.json(
        { status: false, message: data.message || 'Failed to save location' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Lokasi tersimpan',
    });
  } catch (error) {
    console.error('Error saving location:', error);
    return NextResponse.json(
      { status: false, message: 'Failed to save location' },
      { status: 500 }
    );
  }
}
