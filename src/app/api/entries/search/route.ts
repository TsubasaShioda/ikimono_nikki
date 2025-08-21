import { NextResponse } from 'next/server';
import { PrismaClient, PrivacyLevel } from '@prisma/client';
import { jwtVerify } from 'jose';

const prisma = new PrismaClient();

// Helper function to get userId from token
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
    const userId = await getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const categoryId = searchParams.get('categoryId');
    const minLat = searchParams.get('minLat');
    const maxLat = searchParams.get('maxLat');
    const minLng = searchParams.get('minLng');
    const maxLng = searchParams.get('maxLng');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const timeOfDay = searchParams.get('timeOfDay'); // 'morning', 'daytime', 'night'

    // Get friend IDs for the current user
    const friendships = await prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: userId },
          { addresseeId: userId },
        ],
      },
      select: {
        requesterId: true,
        addresseeId: true,
      },
    });

    const friendIds = friendships.map(f => 
      f.requesterId === userId ? f.addresseeId : f.requesterId
    );

    const whereConditions: any = {
      AND: [ // Apply privacy filters
        {
          OR: [
            { privacyLevel: PrivacyLevel.PUBLIC }, // Public entries
            { userId: userId }, // User's own entries (any privacy level)
            { // Friends-only entries from accepted friends
              privacyLevel: PrivacyLevel.FRIENDS_ONLY,
              userId: { in: friendIds },
            },
          ],
        },
      ],
    };

    if (query && query.trim() !== '') {
      whereConditions.AND.push({
        OR: [
          { title: { contains: query } },
          { description: { contains: query } },
        ],
      });
    }

    if (categoryId) {
      whereConditions.AND.push({ categoryId: categoryId });
    }

    // Add geographical filters
    if (minLat && maxLat && minLng && maxLng) {
      whereConditions.AND.push({
        latitude: {
          gte: parseFloat(minLat),
          lte: parseFloat(maxLat),
        },
        longitude: {
          gte: parseFloat(minLng),
          lte: parseFloat(maxLng),
        },
      });
    }

    // Add date range filters
    if (startDate || endDate) {
      const takenAtCondition: any = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        takenAtCondition.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        takenAtCondition.lte = end;
      }
      whereConditions.AND.push({ takenAt: takenAtCondition });
    }

    let entries = await prisma.diaryEntry.findMany({
      where: whereConditions,
      orderBy: { createdAt: 'desc' },
      include: { // Include user info
        user: {
          select: {
            id: true,
            username: true,
            iconUrl: true,
          }
        }
      }
    });

    // Add time of day filtering if specified
    if (timeOfDay && timeOfDay !== 'all') {
      entries = entries.filter(entry => {
        const jstDate = new Date(new Date(entry.takenAt).toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
        const hour = jstDate.getHours();
        
        switch (timeOfDay) {
          case 'morning': // 5:00 - 9:59
            return hour >= 5 && hour < 10;
          case 'daytime': // 10:00 - 15:59
            return hour >= 10 && hour < 16;
          case 'night': // 16:00 - 4:59
            return hour >= 16 || hour < 5;
          default:
            return true;
        }
      });
    }

    return NextResponse.json({ entries }, { status: 200 });
  } catch (error) {
    console.error('Diary search error:', error);
    return NextResponse.json({ message: '日記の検索中にエラーが発生しました' }, { status: 500 });
  }
}
