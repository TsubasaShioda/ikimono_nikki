import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  console.log('POST /api/hidden-entries received');
  try {
    const token = req.cookies.get('token')?.value;
    const user = await verifyToken(token);
    const userId = user?.userId;

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