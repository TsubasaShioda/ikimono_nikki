import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  console.log('POST /api/hidden-users received');
  try {
    const token = req.cookies.get('token')?.value;
    const user = await verifyToken(token);
    const userId = user?.userId;

    if (!userId) {
      console.log('POST /api/hidden-users: User not authenticated');
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { hiddenUserId } = await req.json();
    if (!hiddenUserId) {
      console.log('POST /api/hidden-users: Missing hiddenUserId');
      return NextResponse.json({ error: '対象のユーザーIDが必要です' }, { status: 400 });
    }

    if (userId === hiddenUserId) {
      console.log('POST /api/hidden-users: Cannot hide self');
      return NextResponse.json({ error: '自分自身を非表示にすることはできません' }, { status: 400 });
    }

    // 既に非表示にしていないか確認
    const existingHiddenUser = await prisma.hiddenUser.findUnique({
      where: {
        userId_hiddenUserId: {
          userId,
          hiddenUserId,
        },
      },
    });

    if (existingHiddenUser) {
      console.log('POST /api/hidden-users: User already hidden', hiddenUserId);
      return NextResponse.json({ message: 'このユーザーは既に非表示に設定されています' }, { status: 200 });
    }

    // 非表示リストに追加
    await prisma.hiddenUser.create({
      data: {
        userId,
        hiddenUserId,
      },
    });

    console.log('POST /api/hidden-users: Successfully hid user', hiddenUserId);
    return NextResponse.json({ message: 'ユーザーを非表示にしました' }, { status: 201 });
  } catch (error) {
    console.error('Error hiding user:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  console.log('GET /api/hidden-users received');
  try {
    const token = req.cookies.get('token')?.value;
    const user = await verifyToken(token);
    const userId = user?.userId;

    if (!userId) {
      console.log('GET /api/hidden-users: User not authenticated');
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const hiddenUsers = await prisma.hiddenUser.findMany({
      where: { userId },
      select: {
        id: true, // HiddenUserレコード自体のIDも選択
        hiddenUser: {
          select: {
            id: true,
            username: true,
            iconUrl: true,
          },
        },
      },
    });

    console.log('GET /api/hidden-users: Found hidden users', hiddenUsers.length);
    return NextResponse.json({ hiddenUsers }, { status: 200 });
  } catch (error) {
    console.error('Error fetching hidden users:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}