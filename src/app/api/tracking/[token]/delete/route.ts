import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getAuthUser, isAdmin } from '@/lib/auth-server';

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

    const session = await db.trackingSession.findUnique({
      where: { token },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Tracking session not found', success: false },
        { status: 404 }
      );
    }

    // Check ownership - only owner or admin can delete
    const isOwner = session.userId === user.googleId;
    const userIsAdmin = isAdmin(user.roleId);

    if (!isOwner && !userIsAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this session', success: false },
        { status: 403 }
      );
    }

    // Delete session (cascade will delete locations too)
    await db.trackingSession.delete({
      where: { token },
    });

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
