'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// 🗄️ تنظیمات اختصاصی دیتابیس Upstash شما
const UPSTASH_URL = "https://enjoyed-moccasin-119717.upstash.io";
const UPSTASH_TOKEN = "gQAAAAAAAdOlAAIgcDI2ZWUzZWNhNzYwNzc0NDA1YjUyYjBmZDY0OTkxMDYzYQ";

// 🔑 کلید اختصاصی اکانت RAWG شما برای جستجوی بازی‌ها
const RAWG_API_KEY = "8ceb3ebba03c4ddca51106af23868263";

// 🔒 تابع استاندارد برای هش کردن پسورد تایپ شده توسط کاربر با الگوریتم SHA-256
async function hashPassword(string: string) {
  const utf8 = new TextEncoder().encode(string);
  const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function AdminPanel() {
  // --- بخش امنیت و ورود ---
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // --- بخش مدیریت بازی‌ها ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [myGames, setMyGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });

  // بررسی وضعیت لاگین قبلی از طریق LocalStorage (برای جلوگیری از خروج با رفرش صفحه)
  useEffect(() => {
    const adminStatus = localStorage.getItem('isAdmin');
    if (adminStatus === 'true') {
      setIsLoggedIn(true);
      fetchMyGames();
    }
  }, []);

  // هندلر دکمه ورود ادمین
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // هش کردن پسوردی که کاربر همین الان در کادر تایپ کرده
    const userTypedHash = await hashPassword(password);

    // مقایسه نام کاربری و هش ۶۴ کاراکتری پسورد شما بدون لو رفتن رمز اصلی
    if (username === 'HF273' && userTypedHash === '95ed82328afcc54d826006515d6334f77dab3fe2d2bec5b85fa9503ac19c502a') {
      setIsLoggedIn(true);
      setLoginError('');
      localStorage.setItem('isAdmin', 'true');
      fetchMyGames();
    } else {
      setLoginError('نام کاربری یا رمز عبور اشتباه است!');
    }
  };

  // هندلر خروج از پنل
  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('isAdmin');
  };

  // دریافت لیست بازی‌های ذخیره شده مستقیماً از Upstash
  const fetchMyGames = async () => {
    try {
      const res = await fetch(`${UPSTASH_URL}/get/games`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
      });
      if (res.ok) {
        const data = await res.json();
        // داده‌ها در Upstash به صورت رشته ذخیره می‌شوند و اینجا پارس می‌شوند
        setMyGames(data.result ? JSON.parse(data.result) : []);
      }
    } catch (err) {
      console.error('خطا در دریافت لیست بازی‌ها از Upstash', err);
    }
  };

  // جستجوی بازی از سرویس RAWG مستقیماً در فرانت‌بند
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    setMessage({ text: '', isError: false });
    setSearchResults([]); 

    try {
      const res = await fetch(`https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error('خطا در دریافت اطلاعات از RAWG');
      
      const data = await res.json();
      setSearchResults(Array.isArray(data.results) ? data.results : []);
    } catch (err: any) {
      setMessage({ text: err.message, isError: true });
    } finally {
      setLoading(false);
    }
  };

  // اضافه کردن بازی جدید به آرشیو Upstash
  const handleAddGame = async (game: any) => {
    setMessage({ text: '', isError: false });
    
    if (myGames.some((g) => g.id.toString() === game.id.toString())) {
      setMessage({ text: `بازی "${game.name}" از قبل در لیست شما موجود است!`, isError: true });
      return;
    }

    const updatedGames = [...myGames, {
      id: game.id,
      name: game.name,
      released: game.released,
      rating: game.rating,
      background_image: game.background_image,
      short_screenshots: game.short_screenshots,
      genres: game.genres,
      playtime: game.playtime,
      esrb_rating: game.esrb_rating,
      tags: game.tags || []
    }];

    try {
      // کل آرایه آپدیت شده بازی‌ها را یک‌جا به شکل رشته در دیتابیس ست می‌کنیم
      const res = await fetch(`${UPSTASH_URL}/set/games`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
        body: JSON.stringify(JSON.stringify(updatedGames))
      });

      if (!res.ok) throw new Error('خطا در ذخیره‌سازی روی دیتابیس');

      setMessage({ text: `بازی "${game.name}" با موفقیت اضافه شد.`, isError: false });
      setMyGames(updatedGames);
    } catch (err: any) {
      setMessage({ text: err.message, isError: true });
    }
  };

  // حذف بازی از آرشیو Upstash
  const handleDeleteGame = async (gameId: number, gameName: string) => {
    if (!confirm(`آیا از حذف بازی "${gameName}" مطمئن هستید؟`)) return;
    setMessage({ text: '', isError: false });

    const updatedGames = myGames.filter((g) => g.id.toString() !== gameId.toString());

    try {
      const res = await fetch(`${UPSTASH_URL}/set/games`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
        body: JSON.stringify(JSON.stringify(updatedGames))
      });

      if (!res.ok) throw new Error('خطا در حذف بازی از دیتابیس');

      setMessage({ text: `بازی "${gameName}" با موفقیت حذف شد.`, isError: false });
      setMyGames(updatedGames);
    } catch (err: any) {
      setMessage({ text: err.message, isError: true });
    }
  };

  // تونل تصویر برای باز شدن عکس‌ها بدون تحریم و نیاز به وی‌پی‌ان
  const getAdminImage = (url: string) => {
    if (!url) return '';
    const cleanUrl = url.replace(/^https?:\/\//i, '');
    return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=500&q=80&output=jpg`;
  };

  // --- پوسته گرافیکی صفحه ورود (در صورت لاگین نبودن) ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4" dir="rtl">
        <div className="bg-slate-900/60 p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-800 backdrop-blur-md">
          <h1 className="text-2xl font-black text-white text-center mb-6">ورود به پنل مدیریت</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-slate-400 text-sm mb-2 font-medium">نام کاربری:</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:outline-none focus:border-purple-500 transition text-left"
                dir="ltr"
                required
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-2 font-medium">رمز عبور:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-white focus:outline-none focus:border-purple-500 transition text-left"
                dir="ltr"
                required
              />
            </div>
            {loginError && <p className="text-red-400 text-sm text-center font-bold">{loginError}</p>}
            <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-2xl transition shadow-lg shadow-purple-900/20 mt-2">
              ورود به پنل
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- پوسته گرافیکی پنل اصلی مدیریت بازی‌ها (بعد از لاگین موفق) ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-12 border-b border-slate-900 pb-6">
          <h1 className="text-3xl font-black text-white bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
            پنل مدیریت و آرشیو بازی‌ها
          </h1>
          <div className="flex items-center gap-3">
            <Link href="/" className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl transition text-sm font-bold">
              🌐 مشاهده سایت اصلی
            </Link>
            <button onClick={handleLogout} className="px-4 py-2 bg-slate-900 hover:bg-red-950/40 text-red-400 border border-slate-800 rounded-xl transition text-sm font-bold">
              خروج از پنل
            </button>
          </div>
        </header>

        <section className="bg-slate-900/40 p-6 rounded-3xl border border-slate-900 mb-8 backdrop-blur-sm">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="نام بازی را به انگلیسی بنویسید... (مثلاً: Batman)"
              className="flex-1 p-4 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 font-medium"
            />
            <button type="submit" disabled={loading} className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-2xl transition shadow-lg shadow-purple-900/10">
              {loading ? 'در حال جستجو...' : 'جستجوی بازی'}
            </button>
          </form>
          {message.text && (
            <div className={`mt-4 p-4 rounded-2xl text-center font-medium border ${message.isError ? 'bg-red-950/40 text-red-400 border-red-900/50' : 'bg-green-950/40 text-green-400 border-green-900/50'}`}>
              {message.text}
            </div>
          )}
        </section>

        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-pulse">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-slate-900/40 border border-slate-900 rounded-3xl h-64 p-4 flex flex-col justify-between">
                <div className="w-full h-32 bg-slate-800 rounded-2xl"></div>
                <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                <div className="h-10 bg-slate-800 rounded-2xl w-full"></div>
              </div>
            ))}
          </div>
        )}

        {!loading && searchResults.length > 0 && (
          <section className="mb-12">
            <h2 className="text-lg font-bold text-slate-400 mb-6 border-r-4 border-purple-500 pr-3">نتایج یافت شده:</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {searchResults.map((game) => {
                const isAlreadyAdded = myGames.some((g) => g.id.toString() === game.id.toString());
                return (
                  <div key={game.id} className="bg-slate-900/30 border border-slate-900 rounded-3xl overflow-hidden shadow-lg flex flex-col justify-between group hover:border-purple-500/30 transition duration-300 backdrop-blur-sm">
                    <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                      {game.background_image ? (
                        <img 
                          src={getAdminImage(game.background_image)} 
                          alt={game.name} 
                          className="object-cover w-full h-full group-hover:scale-105 transition duration-500" 
                          referrerPolicy="no-referrer"
                          loading="lazy" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">بدون تصویر</div>
                      )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div className="mb-4">
                        <h3 className="font-bold text-white text-sm md:text-base line-clamp-1 mb-1" title={game.name}>{game.name}</h3>
                        <p className="text-[11px] text-slate-500">انتشار: {game.released ? game.released.split('-')[0] : 'نامشخص'}</p>
                      </div>
                      {isAlreadyAdded ? (
                        <button onClick={() => handleDeleteGame(game.id, game.name)} className="w-full py-2.5 bg-red-950/30 hover:bg-red-600 text-red-400 hover:text-white font-bold rounded-xl border border-red-900/40 transition text-xs">
                          ❌ حذف از آرشیو
                        </button>
                      ) : (
                        <button onClick={() => handleAddGame(game)} className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition text-xs shadow-md">
                          ➕ اضافه به آرشیو
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
