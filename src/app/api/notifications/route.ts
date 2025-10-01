import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

// GET all notifications for the current user
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    const user = await verifyToken(token);
    const userId = user?.userId;

    if (!userId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: { recipientId: userId },
      include: {
        actor: {
          select: {
            id: true,
            username: true,
            iconUrl: true,
          },
        },
        diaryEntry: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 30, // Limit to the last 30 notifications
    });

    const unreadCount = await prisma.notification.count({
        where: {
            recipientId: userId,
            isRead: false,
        }
    });

    return NextResponse.json({ notifications, unreadCount }, { status: 200 });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// POST to mark all notifications as read
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    const user = await verifyToken(token);
    const userId = user?.userId;

    if (!userId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    await prisma.notification.updateMany({
      where: {
        recipientId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({ message: 'すべての通知を既読にしました' }, { status: 200 });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}