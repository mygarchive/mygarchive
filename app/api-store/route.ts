import { NextResponse } from 'next/server';

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

// 🔍 تابع دیباگ برای بررسی وضعیت متغیرها در لاگ سرور
function debugEnvironment() {
  console.log("--- DEBUG UPSTASH CONFIG ---");
  console.log("URL Configured:", UPSTASH_URL ? "YES (Starts with: " + UPSTASH_URL.substring(0, 15) + ")" : "NO (EMPTY)");
  console.log("Token Configured:", UPSTASH_TOKEN ? "YES (Starts with: " + UPSTASH_TOKEN.substring(0, 8) + "... Length: " + UPSTASH_TOKEN.length + ")" : "NO (EMPTY)");
  console.log("----------------------------");
}

async function runRedisCommand(command: string[]) {
  // اجرای دیباگ در هر درخواست
  debugEnvironment();

  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    console.error('Upstash credentials are missing in process.env!');
    return null;
  }

  try {
    // اصلاح فرمت آدرس: مطمئن می‌شویم آدرس به / pipeline ختم شود تا دستورات آرایه‌ای درست کار کنند
    const baseUrl = UPSTASH_URL.trim().replace(/\/$/, '');
    const finalUrl = `${baseUrl}/pipeline`;

    const res = await fetch(finalUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${UPSTASH_TOKEN.trim()}`,
        'Content-Type': 'application/json',
      },
      // دستورات به صورت آرایه‌ای از آرایه‌ها ارسال می‌شوند
      body: JSON.stringify([command]),
    });

    if (!res.ok) {
      console.error(`Upstash Response Error! Status: ${res.status} ${res.statusText}`);
      const errorText = await res.text();
      console.error("Upstash Error Body:", errorText);
      return null;
    }
    
    const data = await res.json();
    // چون دستور به صورت خط لوله (pipeline) فرستاده شده، نتیجه اولین دستور را برمی‌گردانیم
    return data[0]?.result;
  } catch (err) {
    console.error('Upstash communication error:', err);
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const id = searchParams.get('id');

    // ۱. بخش جستجوی بازی از API اصلی RAWG
    if (search) {
      // ابتدا بررسی می‌کنیم آیا دیتابیس در دسترس است یا کلا توکن ایراد دارد
      // هدف این است که حتی اگر دیتابیس ارور داد، بفهمیم لاگ‌ها چه می‌گویند
      const testRedis = await runRedisCommand(['EXISTS', 'my_games_dict']);
      if (testRedis === null) {
        return NextResponse.json({ error: 'خطای احراز هویت دیتابیس (401)' }, { status: 401 });
      }

      const apiKey = '68b92b6794614ffcb7d091e0a9d80fc4';
      const apiUrl = `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(search)}&page_size=12`;
      
      const res = await fetch(apiUrl);
      if (!res.ok) {
        return NextResponse.json({ error: 'خطا در دریافت اطلاعات از RAWG' }, { status: res.status });
      }
      
      const data = await res.json();
      return NextResponse.json(data.results || []);
    }

    // ۲. دریافت اطلاعات کل بازی‌ها از دیتابیس آپستاش
    const rawValues = await runRedisCommand(['HVALS', 'my_games_dict']);
    
    if (!rawValues || !Array.isArray(rawValues) || rawValues.length === 0) {
      return NextResponse.json([]);
    }

    const gamesList = rawValues
      .map((item: any) => {
        try {
          return typeof item === 'string' ? JSON.parse(item) : item;
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean);

    if (id) {
      const singleGame = gamesList.find((g: any) => g.id.toString() === id.toString());
      return NextResponse.json(singleGame || null);
    }

    return NextResponse.json(gamesList);

  } catch (globalError: any) {
    console.error('Global API Error:', globalError);
    return NextResponse.json({ error: 'Internal Server Error', details: globalError.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || !body.id) {
      return NextResponse.json({ error: 'دیتا یا شناسه بازی معتبر نیست' }, { status: 400 });
    }

    await runRedisCommand(['HSET', 'my_games_dict', body.id.toString(), JSON.stringify(body)]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'خطا در ذخیره‌سازی دیتابیس' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'شناسه الزامی است' }, { status: 400 });

    await runRedisCommand(['HDEL', 'my_games_dict', id.toString()]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'خطا در حذف' }, { status: 500 });
  }
}
