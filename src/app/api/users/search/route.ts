import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';

const prisma = new PrismaClient();

// Helper function to get userId from token
async function getUserIdFromToken(request: Request): Promise<string | null> {
  const token = request.cookies.get('auth_token')?.value;
  const jwtSecret = process.env.JWT_SECRET;
  if (!token || !jwtSecret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret));
    return payload.userId as string;
  } catch (error) {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim() === '') {
      return NextResponse.json({ users: [] }, { status: 200 });
    }

    // 1. Find all existing relationships for the current user.
    const existingFriendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: userId },
          { addresseeId: userId },
        ],
      },
    });

    // 2. Create a list of user IDs to exclude from the search.
    const excludedUserIds = existingFriendships.map(f => 
      f.requesterId === userId ? f.addresseeId : f.requesterId
    );
    // Also exclude the current user themselves.
    excludedUserIds.push(userId);

    // 3. Find users, excluding those already in a relationship with the current user.
    const users = await prisma.user.findMany({
      where: {
        username: {
          contains: query,
        },
        id: {
          notIn: excludedUserIds, // Exclude the list of user IDs
        },
      },
      select: {
        id: true,
        username: true,
        iconUrl: true,
      },
      take: 10,
    });

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error('User search error:', error);
    return NextResponse.json({ message: 'ユーザー検索中にエラーが発生しました' }, { status: 500 });
  }
}