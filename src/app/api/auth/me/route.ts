import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';
import { hash } from 'bcryptjs';
import { promises as fs } from 'fs'; // 追加
import path from 'path'; // 追加

const prisma = new PrismaClient();

// Helper function to verify JWT and get userId (re-use from [id]/route.ts)
async function getUserIdFromToken(request: Request): Promise<string | null> {
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
      select: { id: true, username: true, email: true, description: true, iconUrl: true }, // descriptionとiconUrlを追加
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

export async function PUT(request: Request) {
  try {
    const userId = await getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 });
    }

    const formData = await request.formData(); // request.json() から変更
    const username = formData.get('username') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password'); // string | FormDataEntryValue | null になる可能性があるので型アサーションを削除
    const description = formData.get('description') as string; // 追加
    const icon = formData.get('icon') as File | null; // 追加

    // Find the existing user
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({ message: 'ユーザーが見つかりません' }, { status: 404 });
    }

    // Prepare data for update
    const updateData: { username?: string; email?: string; password_hash?: string; description?: string; iconUrl?: string | null } = {}; // 型を更新
    
    if (username !== undefined && username !== existingUser.username) {
      updateData.username = username;
    }
    if (email !== undefined && email !== existingUser.email) {
      // Check if new email already exists for another user
      const emailExists = await prisma.user.findUnique({
        where: { email: email },
      });
      if (emailExists && emailExists.id !== userId) {
        return NextResponse.json({ message: 'このメールアドレスは既に使用されています' }, { status: 409 });
      }
      updateData.email = email;
    }
    // パスワード更新ロジックを修正
    if (password !== null && password !== '' && typeof password === 'string') {
      updateData.password_hash = await hash(password, 10);
    }
    if (description !== undefined && description !== existingUser.description) { // descriptionの更新ロジック
      updateData.description = description;
    }

    let iconUrl: string | null = existingUser.iconUrl; // 既存のiconUrlを保持
    if (icon) {
      // Delete old icon if it exists
      if (existingUser.iconUrl) {
        const oldIconPath = path.join(process.cwd(), 'public', existingUser.iconUrl);
        try {
          await fs.unlink(oldIconPath);
        } catch (unlinkError) {
          console.error('Failed to delete old icon:', unlinkError);
          // Continue even if old icon deletion fails
        }
      }

      // Upload new icon
      const buffer = Buffer.from(await icon.arrayBuffer());
      const filename = `${Date.now()}-icon-${icon.name}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads'); // uploadsディレクトリを使用
      const filePath = path.join(uploadDir, filename);
      await fs.writeFile(filePath, buffer);
      iconUrl = `/uploads/${filename}`;
    } else if (formData.get('iconUrl') === '') { // Handle case where icon is removed (frontend sends empty string)
      if (existingUser.iconUrl) {
        const oldIconPath = path.join(process.cwd(), 'public', existingUser.iconUrl);
        try {
          await fs.unlink(oldIconPath);
        } catch (unlinkError) {
          console.error('Failed to delete old icon:', unlinkError);
        }
      }
      iconUrl = null;
    }
    updateData.iconUrl = iconUrl; // iconUrlをupdateDataに追加

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: '更新する情報がありません' }, { status: 200 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, username: true, email: true, description: true, iconUrl: true }, // selectを更新
    });

    return NextResponse.json({ message: 'プロフィールが正常に更新されました', user: updatedUser }, { status: 200 });
  } catch (error) {
    console.error('プロフィール更新エラー:', error);
    return NextResponse.json({ message: 'プロフィールの更新中にエラーが発生しました' }, { status: 500 });
  }
}