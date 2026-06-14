import { NextResponse } from 'next/server';

// شبیه‌ساز دیتابیس ابری کلودفلر در محیط توسعه
// وقتی سایت روی کلودفلر آپلود شود، این بخش به KV واقعی وصل می‌شود
let globalGamesDatabase: any[] = [];

// ۱. متد دریافت بازی‌ها از دیتابیس
export async function GET() {
  return NextResponse.json(globalGamesDatabase);
}

// ۲. متد ذخیره بازی جدید در دیتابیس
export async function POST(request: Request) {
  try {
    const gameData = await request.json();
    
    // بررسی تکراری نبودن بازی
    const exists = globalGamesDatabase.some(g => g.id === gameData.id);
    if (exists) {
      return NextResponse.json({ error: 'این بازی قبلاً اضافه شده است' }, { status: 400 });
    }
    
    globalGamesDatabase.push(gameData);
    return NextResponse.json({ success: true, message: 'بازی با موفقیت در دیتابیس ذخیره شد' });
  } catch (error) {
    return NextResponse.json({ error: 'خطا در ثبت داده‌ها' }, { status: 500 });
  }
}