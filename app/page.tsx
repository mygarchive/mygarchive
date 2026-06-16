'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🌐 خواندن مستقیم و زنده از لینک RAW گیت‌هاب برای دور زدن زمان بیلد اکشن‌ها
    // به همراه پارامتر زمان زمان حال (?v=) جهت خنثی کردن ۱۰۰٪ کش مرورگر و CDN
    fetch(`https://raw.githubusercontent.com/mygarchive/mygarchive.github.io/main/data/games.json?v=${Date.now()}`, {
      cache: 'no-store'
    })
      .then((res) => {
        if (!res.ok) throw new Error('فایل دیتابیس هنوز ساخته نشده یا در دسترس نیست.');
        return res.json();
      })
      .then((data) => {
        setGames(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('خطا در بارگذاری بازی‌های صفحه اصلی از سرور زنده:', err);
        // لود بک‌آپ محلی در صورت بروز هرگونه خطای شبکه
        fetch('/data/games.json', { cache: 'no-store' })
          .then((res) => res.json())
          .then((localData) => setGames(Array.isArray(localData) ? localData : []))
          .catch(() => {})
          .finally(() => setLoading(false));
      });
  }, []);

  // 🖼️ بهینه‌سازی سایز عکس‌ها برای صفحه اصلی (فشرده، سریع و ضدتحریم ایران)
  const getBypassUrl = (url: string) => {
    if (!url) return '';
    const cleanUrl = url.replace(/^https?:\/\//i, '');
    return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=400&q=80&output=jpg`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-bold animate-pulse" dir="rtl">
        در حال بارگذاری آرشیو بازی‌ها به صورت آنی...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-12 border-b border-slate-900 pb-6">
          <h1 className="text-2xl md:text-3xl font-black text-white">🎮 آرشیو شخصی بازی‌های من</h1>
        </header>

        {games.length === 0 ? (
          <p className="text-center text-slate-600 py-12">آرشیو بازی‌ها در حال حاضر خالی است.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {games.map((game) => (
              <Link 
                href={`/game?id=${game.id}`} 
                key={game.id} 
                className="bg-slate-900/40 border border-slate-900/80 rounded-2xl overflow-hidden hover:border-purple-500/40 transition duration-300 flex flex-col justify-between group"
              >
                <div className="aspect-video w-full overflow-hidden bg-slate-950">
                  <img 
                    src={getBypassUrl(game.background_image)} 
                    alt={game.name} 
                    className="object-cover w-full h-full group-hover:scale-105 transition duration-500" 
                    loading="lazy"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-white text-sm line-clamp-1 mb-1 text-right" dir="ltr">{game.name}</h3>
                  <p className="text-xs text-slate-500">امتیاز: ★ {game.rating?.toFixed(1) || '0'}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
