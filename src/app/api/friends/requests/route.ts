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

export async function POST(request: Request) {
  try {
    const requesterId = await getUserIdFromToken(request);
    if (!requesterId) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 });
    }

    const { addresseeId } = await request.json();

    if (!addresseeId) {
      return NextResponse.json({ message: '申請先のユーザーIDが必要です' }, { status: 400 });
    }

    if (requesterId === addresseeId) {
      return NextResponse.json({ message: '自分自身にフレンド申請は送れません' }, { status: 400 });
    }

    // Check if a friendship already exists or is pending
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: requesterId, addresseeId: addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    });

    if (existingFriendship) {
        if(existingFriendship.status === 'ACCEPTED'){
            return NextResponse.json({ message: '既にフレンドです' }, { status: 409 });
        }
        if(existingFriendship.status === 'PENDING'){
            return NextResponse.json({ message: '既に申請済みです' }, { status: 409 });
        }
         if(existingFriendship.status === 'DECLINED'){
            return NextResponse.json({ message: '相手から申請が拒否されています' }, { status: 409 });
        }
    }

    // Create new friendship request
    const newFriendship = await prisma.friendship.create({
      data: {
        requesterId,
        addresseeId,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ message: 'フレンド申請を送信しました', friendship: newFriendship }, { status: 201 });
  } catch (error) {
    console.error('Friend request error:', error);
    return NextResponse.json({ message: 'フレンド申請中にエラーが発生しました' }, { status: 500 });
  }
}
