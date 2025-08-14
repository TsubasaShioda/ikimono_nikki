import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const token = request.cookies.get('auth_token')?.value;
  const jwtSecret = process.env.JWT_SECRET;

  if (!token || !jwtSecret) {
    return NextResponse.json({ message: '認証が必要です' }, { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret));
    const userId = payload.userId as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true }, // Select only necessary fields
    });

    if (!user) {
      return NextResponse.json({ message: 'ユーザーが見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch user info:', error);
    return NextResponse.json({ message: 'ユーザー情報の取得中にエラーが発生しました' }, { status: 500 });
  }
}