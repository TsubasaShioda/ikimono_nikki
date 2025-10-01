import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // カテゴリは公開情報のため認証は不要
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