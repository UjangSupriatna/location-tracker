import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

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
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    const session = await db.trackingSession.findUnique({
      where: { token },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Tracking session not found' },
        { status: 404 }
      );
    }

    // Check if expired
    if (session.expiresAt && new Date() > session.expiresAt) {
      return NextResponse.json(
        { error: 'Tracking link has expired' },
        { status: 410 }
      );
    }

    const location = await db.locationHistory.create({
      data: {
        sessionId: session.id,
        latitude,
        longitude,
        accuracy: accuracy || null,
      },
    });

    // Update session last online
    await db.trackingSession.update({
      where: { token },
      data: { lastOnline: new Date() },
    });

    return NextResponse.json({
      success: true,
      location: {
        id: location.id,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        timestamp: location.timestamp,
      },
    });
  } catch (error) {
    console.error('Error updating location:', error);
    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    );
  }
}
