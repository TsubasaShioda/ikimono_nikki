import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';

const prisma = new PrismaClient();

// Helper function to get userId from token (duplicated for now, will refactor later)
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

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 });
    }

    const { diaryEntryId } = await request.json();

    if (!diaryEntryId) {
      return NextResponse.json({ message: '日記IDが不足しています' }, { status: 400 });
    }

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_diaryEntryId: {
          userId,
          diaryEntryId,
        },
      },
    });

    if (existingLike) {
      // いいねが存在する場合は削除
      await prisma.like.delete({
        where: {
          userId_diaryEntryId: {
            userId,
            diaryEntryId,
          },
        },
      });
      return NextResponse.json({ message: 'いいねを解除しました' }, { status: 200 });
    } else {
      // いいねが存在しない場合は作成
      const like = await prisma.like.create({
        data: {
          userId,
          diaryEntryId,
        },
      });
      return NextResponse.json({ message: 'いいねしました', like }, { status: 201 });
    }
  } catch (error) {
    console.error('いいね処理エラー:', error);
    return NextResponse.json({ message: 'いいね処理中にエラーが発生しました' }, { status: 500 });
  }
}


