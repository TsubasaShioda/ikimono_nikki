
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';

const prisma = new PrismaClient();

// Helper function to verify JWT and get userId
async function getUserIdFromToken(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('auth_token')?.value;
  const jwtSecret = process.env.JWT_SECRET;

  if (!token || !jwtSecret) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret));
    return payload.userId as string;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  console.log('DELETE /api/hidden-entries/[id] received');
  try {
    const { id } = params; // idはhiddenEntryのID
    const userId = await getUserIdFromToken(req);

    if (!userId) {
      console.log('DELETE /api/hidden-entries/[id]: User not authenticated');
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // hiddenEntryの存在と所有者の確認
    const hiddenEntryToDelete = await prisma.hiddenEntry.findUnique({
      where: { id },
    });

    if (!hiddenEntryToDelete) {
      console.log('DELETE /api/hidden-entries/[id]: Hidden entry not found', id);
      return NextResponse.json({ message: '非表示設定が見つかりません' }, { status: 404 });
    }

    if (hiddenEntryToDelete.userId !== userId) {
      console.log('DELETE /api/hidden-entries/[id]: Unauthorized attempt to delete hidden entry', id);
      return NextResponse.json({ message: 'この非表示設定を削除する権限がありません' }, { status: 403 });
    }

    await prisma.hiddenEntry.delete({
      where: { id },
    });

    console.log('DELETE /api/hidden-entries/[id]: Successfully unhid entry', hiddenEntryToDelete.entryId);
    return NextResponse.json({ message: '非表示設定を解除しました' }, { status: 200 });
  } catch (error) {
    console.error('Error unhiding entry:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
