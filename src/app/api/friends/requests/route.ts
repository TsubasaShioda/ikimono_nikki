import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient, NotificationType } from '@prisma/client';
import { jwtVerify } from 'jose';

const prisma = new PrismaClient();

// Helper function to get userId from token
async function getUserIdFromToken(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('auth_token')?.value;
  const jwtSecret = process.env.JWT_SECRET;
  if (!token || !jwtSecret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret));
    return payload.userId as string;
  } catch (error) {
    console.error("JWT verification error:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 });
    }

    const friendRequests = await prisma.friendship.findMany({
      where: {
        addresseeId: userId,
        status: 'PENDING',
      },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            iconUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ friendRequests }, { status: 200 });
  } catch (error) {
    console.error('Fetch friend requests error:', error);
    return NextResponse.json({ message: 'フレンド申請の取得中にエラーが発生しました' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    // Use a transaction to create friendship and notification together
    const [newFriendship] = await prisma.$transaction([
      prisma.friendship.create({
        data: {
          requesterId,
          addresseeId,
          status: 'PENDING',
        },
      }),
      prisma.notification.create({
        data: {
          type: NotificationType.FRIEND_REQUEST,
          recipientId: addresseeId,
          actorId: requesterId,
        },
      }),
    ]);

    return NextResponse.json({ message: 'フレンド申請を送信しました', friendship: newFriendship }, { status: 201 });
  } catch (error) {
    console.error('Friend request error:', error);
    return NextResponse.json({ message: 'フレンド申請中にエラーが発生しました' }, { status: 500 });
  }
}
