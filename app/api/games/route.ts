import { NextRequest, NextResponse } from 'next/server';

// ۱. دریافت لیست بازی‌های ذخیره شده در دیتابیس خودت برای صفحه اصلی
export async function GET(request: NextRequest) {
  try {
    const myKv = (process.env as any).GAME_KV;
    if (!myKv) {
      return NextResponse.json([]);
    }

    const gamesData = await myKv.get("games_list");
    const games = gamesData ? JSON.parse(gamesData) : [];
    return NextResponse.json(games);

  } catch (error: any) {
    return NextResponse.json({ error: `خطای سرور: ${error.message || 'ناشناخته'}` }, { status: 500 });
  }
}

// ۲. ذخیره بازی جدید در دیتابیس ابری کلودفلر
export async function POST(request: Request) {
  try {
    const myKv = (process.env as any).GAME_KV;
    if (!myKv) {
      return NextResponse.json({ error: "اتصال دیتابیس KV برقرار نیست." }, { status: 500 });
    }

    const gameData = await request.json();
    
    const gamesData = await myKv.get("games_list");
    const games = gamesData ? JSON.parse(gamesData) : [];
    
    const exists = games.some((g: any) => g.id.toString() === gameData.id.toString());
    if (exists) {
      return NextResponse.json({ error: 'این بازی قبلاً اضافه شده است.' }, { status: 400 });
    }
    
    games.push(gameData);
    await myKv.put("games_list", JSON.stringify(games));
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: `خطا در ثبت اطلاعات: ${error.message}` }, { status: 500 });
  }
}
