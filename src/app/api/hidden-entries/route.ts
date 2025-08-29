
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose'; // joseをインポート

const prisma = new PrismaClient();

// Helper function to verify JWT and get userId (from src/app/api/entries/search/route.ts)
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

export async function POST(req: NextRequest) {
  console.log('POST /api/hidden-entries received');
  try {
    const userId = await getUserIdFromToken(req); // getAuth()の代わりにgetUserIdFromTokenを使用
    if (!userId) {
      console.log('POST /api/hidden-entries: User not authenticated');
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { entryId } = await req.json();
    if (!entryId) {
      console.log('POST /api/hidden-entries: Missing entryId');
      return NextResponse.json({ error: '投稿IDが必要です' }, { status: 400 });
    }

    // 既に非表示にしていないか確認
    const existingHiddenEntry = await prisma.hiddenEntry.findUnique({
      where: {
        userId_entryId: {
          userId,
          entryId,
        },
      },
    });

    if (existingHiddenEntry) {
      console.log('POST /api/hidden-entries: Entry already hidden', entryId);
      return NextResponse.json({ message: 'この投稿は既に非表示に設定されています' }, { status: 200 });
    }

    // 非表示リストに追加
    await prisma.hiddenEntry.create({
      data: {
        userId,
        entryId,
      },
    });

    console.log('POST /api/hidden-entries: Successfully hid entry', entryId);
    return NextResponse.json({ message: '投稿を非表示にしました' }, { status: 201 });
  } catch (error) {
    console.error('Error hiding entry:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
