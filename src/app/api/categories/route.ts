import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose'; // For authentication, though categories might be public

const prisma = new PrismaClient();

// Helper function to get userId from token (optional for public categories)
async function getUserIdFromToken(request: Request): Promise<string | null> {
  const token = request.cookies.get('auth_token')?.value;
  const jwtSecret = process.env.JWT_SECRET;
  if (!token || !jwtSecret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret));
    return payload.userId as string;
  } catch (error) {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    // Authentication is optional for fetching categories, but good practice for API access
    const userId = await getUserIdFromToken(request);
    if (!userId) {
      // If categories are meant to be public, remove this check
      // For now, we'll keep it simple and assume authenticated access
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 });
    }

    let categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });

    // If no categories exist, seed initial ones
    if (categories.length === 0) {
      const initialCategories = [
        "哺乳類", "鳥類", "魚類", "昆虫", "両生類", "爬虫類", "植物", "菌類", "その他"
      ];
      
      // Use a transaction to ensure all categories are created or none
      await prisma.$transaction(
        initialCategories.map(name => 
          prisma.category.create({ data: { name } })
        )
      );
      
      categories = await prisma.category.findMany({
        orderBy: { name: 'asc' },
      });
    }

    return NextResponse.json({ categories }, { status: 200 });
  } catch (error) {
    console.error('Fetch categories error:', error);
    return NextResponse.json({ message: 'カテゴリの取得中にエラーが発生しました' }, { status: 500 });
  }
}
