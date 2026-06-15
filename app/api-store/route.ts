import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// دریافت لیست بازی‌ها از دیتابیس یا سرچ مستقیم از RAWG در ادمین
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const id = searchParams.get('id');

  // اگر ادمین در حال سرچ بازی جدید است
  if (search) {
    try {
      const apiKey = '68b92b6794614ffcb7d091e0a9d80fc4'; // کلید API شما
      // درخواست مستقیم با تمام جزئیات به RAWG
      const res = await fetch(`https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(search)}&page_size=12`);
      if (!res.ok) throw new Error('RAWG API Error');
      const data = await res.json();
      return NextResponse.json(data.results || []);
    } catch (err) {
      return NextResponse.json({ error: 'خطا در ارتباط با سرور اصلی بازی‌ها' }, { status: 500 });
    }
  }

  // حذف بازی خاص (در صورت پاس دادن دلیور تک)
  if (id) {
    try {
      await redis.hdel('my_games_dict', id.toString());
      return NextResponse.json({ success: true });
    } catch (err) {
      return NextResponse.json({ error: 'خطا در حذف از دیتابیس' }, { status: 500 });
    }
  }

  // در حالت عادی: برگشت دادن کل بازی‌های ذخیره شده در دیتابیس
  try {
    const allGamesMap = await redis.hgetall('my_games_dict');
    if (!allGamesMap) return NextResponse.json([]);
    const gamesList = Object.values(allGamesMap).map((item: any) => typeof item === 'string' ? JSON.parse(item) : item);
    return NextResponse.json(gamesList);
  } catch (err) {
    return NextResponse.json([], { status: 500 });
  }
}

// ذخیره بازی با تمام متادیتاها و فیلدهای کامل بدون هیچ محدودیتی
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'شناسه بازی معتبر نیست' }, { status: 400 });

    // ذخیره مستقیم کل آبجکت ارسالی ادمین در هش‌مپ آپستاش
    await redis.hset('my_games_dict', {
      [body.id.toString()]: JSON.stringify(body)
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطا در ذخیره‌سازی دیتابیس' }, { status: 500 });
  }
}

// متد حذف جایگزین برای کلاینت‌های قدیمی
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'شناسه الزامی است' }, { status: 400 });

  try {
    await redis.hdel('my_games_dict', id.toString());
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'خطا در حذف' }, { status: 500 });
  }
}
