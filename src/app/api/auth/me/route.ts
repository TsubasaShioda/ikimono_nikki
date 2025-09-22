import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';
import { verifyToken } from '@/lib/auth';
import { hash } from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs'; // 追加
import path from 'path'; // 追加

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const userPayload = await verifyToken(token);
    const userId = userPayload?.userId;

    if (!userId) {
      // ユーザーが認証されていない場合は、エラーではなくnullを返す
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, description: true, iconUrl: true },
    });

    if (!user) {
      // このケースは、トークンは有効だがDBにユーザーがいない場合に発生する可能性がある
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    // 予期せぬエラーが発生した場合
    console.error('Failed to fetch user info:', error);
    // この場合もクライアント側でのエラー処理を簡潔にするため、user: null を返す
    return NextResponse.json({ user: null, message: 'ユーザー情報の取得中にエラーが発生しました' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const userPayload = await verifyToken(token);
    const userId = userPayload?.userId;
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

    const bucketName = 'user-icons'; // アイコン用のバケット名 (例: 'user-icons')


    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase URL or Service Role Key is not defined');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    let iconUrl: string | null = existingUser.iconUrl; // 既存のiconUrlを保持
    if (icon) {


      // Delete old icon from Supabase Storage if it exists
      if (existingUser.iconUrl && existingUser.iconUrl.startsWith(`/storage/v1/object/public/${bucketName}/`)) {
        const oldFilename = existingUser.iconUrl.split('/').pop(); // URLからファイル名を取得
        if (oldFilename) {
          const { error: deleteError } = await supabase.storage.from(bucketName).remove([oldFilename]);
          if (deleteError) {
            console.error('Failed to delete old icon from Supabase Storage:', deleteError);
          }
        }
      }

      // Upload new icon to Supabase Storage
      const filename = `${Date.now()}-icon-${icon.name}`;
      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filename, icon, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Supabase icon upload error:', uploadError);
        throw new Error('アイコンのアップロードに失敗しました。');
      }

      iconUrl = supabase.storage.from(bucketName).getPublicUrl(filename).data.publicUrl;
    } else if (formData.get('iconUrl') === '') { // Handle case where icon is removed (frontend sends empty string)
      // Delete old icon from Supabase Storage if it exists
      if (existingUser.iconUrl && existingUser.iconUrl.startsWith(`/storage/v1/object/public/${bucketName}/`)) {
        const oldFilename = existingUser.iconUrl.split('/').pop(); // URLからファイル名を取得
        if (oldFilename) {
          const { error: deleteError } = await supabase.storage.from(bucketName).remove([oldFilename]);
          if (deleteError) {
            console.error('Failed to delete old icon from Supabase Storage:', deleteError);
          }
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