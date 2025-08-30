
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
  console.log('DELETE /api/hidden-users/[id] received');
  try {
    const { id } = params; // idはhiddenUserのID
    const userId = await getUserIdFromToken(req);

    if (!userId) {
      console.log('DELETE /api/hidden-users/[id]: User not authenticated');
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // hiddenUserの存在と所有者の確認
    const hiddenUserToDelete = await prisma.hiddenUser.findUnique({
      where: { id },
    });

    if (!hiddenUserToDelete) {
      console.log('DELETE /api/hidden-users/[id]: Hidden user not found', id);
      return NextResponse.json({ message: '非表示設定が見つかりません' }, { status: 404 });
    }

    if (hiddenUserToDelete.userId !== userId) {
      console.log('DELETE /api/hidden-users/[id]: Unauthorized attempt to delete hidden user', id);
      return NextResponse.json({ message: 'この非表示設定を削除する権限がありません' }, { status: 403 });
    }

    await prisma.hiddenUser.delete({
      where: { id },
    });

    console.log('DELETE /api/hidden-users/[id]: Successfully unhid user', hiddenUserToDelete.hiddenUserId);
    return NextResponse.json({ message: '非表示設定を解除しました' }, { status: 200 });
  } catch (error) {
    console.error('Error unhiding user:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
