'use client';
import { useState, useEffect } from 'react';

interface Game {
  id: any;
  name: string;
  background_image: string;
  rating: number;
  released: string;
  playtime: number;
  genres: { name: string }[];
  platforms?: { platform: { name: string }; requirements_en?: { minimum?: string; recommended?: string } | null }[];
  short_screenshots?: { id: number; image: string }[];
}

const API_KEY = '8ceb3ebba03c4ddca51106af23868263'; 

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Game[]>([]);
  const [myGames, setMyGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  // ۱. خواندن بازی‌ها از دیتابیس به محض باز شدن سایت
  useEffect(() => {
    fetchGamesFromDatabase();
  }, []);

  const fetchGamesFromDatabase = async () => {
    try {
      const res = await fetch('/api/games');
      const data = await res.json();
      setMyGames(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('خطا در دریافت بازی‌ها از دیتابیس');
    }
  };

  const searchGames = async () => {
    if (!searchQuery) return;
    try {
      const res = await fetch(`https://api.rawg.io/api/games?key=${API_KEY}&search=${searchQuery}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      alert('خطا در دریافت اطلاعات بازی‌ها');
    }
  };

  // ۲. فرستادن بازی به دیتابیس برای ذخیره دائمی (اصلاح‌شده برای کلودفلر)
  const addGameToSite = async (game: Game) => {
    setLoading(true);
    try {
      // استانداردسازی دیتای بازی برای هماهنگی کامل با دیتابیس KV کلودفلر
      const optimizedGame = {
        id: game.id.toString(),
        name: game.name,
        background_image: game.background_image || 'https://placehold.co/600x400?text=No+Image',
        rating: game.rating || 0,
        released: game.released || '---',
        playtime: game.playtime || 0,
        genres: game.genres ? game.genres.map(g => ({ name: g.name })) : [],
        platforms: game.platforms ? game.platforms.map(p => ({
          platform: { name: p.platform.name },
          requirements_en: p.requirements_en ? {
            minimum: p.requirements_en.minimum || '',
            recommended: p.requirements_en.recommended || ''
          } : null
        })) : [],
        short_screenshots: game.short_screenshots ? game.short_screenshots.map(s => ({ id: s.id, image: s.image })) : []
      };

      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(optimizedGame)
      });
      
      const result = await res.json();
      
      if (res.ok) {
        alert(`بازی "${game.name}" با موفقیت در دیتابیس ابری ذخیره شد!`);
        await fetchGamesFromDatabase(); // بروزرسانی لیست اصلی
        setSearchResults([]);
        setSearchQuery('');
      } else {
        alert(result.error || 'خطایی در سرور رخ داد');
      }
    } catch (err) {
      alert('اتصال به دیتابیس برقرار نشد.');
    } finally {
      setLoading(false);
    }
  };

  const getPcRequirements = (game: Game) => {
    const pcPlatform = game.platforms?.find(p => p.platform.name.toLowerCase() === 'pc');
    return pcPlatform?.requirements_en || null;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans p-4 md:p-8" dir="rtl">
      {/* هدر سایت */}
      <header className="flex justify-between items-center border-b border-gray-800 pb-4 mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-blue-500 flex items-center gap-2">🕹️ TVTime بازی‌های من</h1>
        <button 
          onClick={() => setIsAdmin(!isAdmin)} 
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-xl text-xs md:text-sm border border-gray-700 transition"
        >
          {isAdmin ? '🔒 خروج از مدیریت' : '🛠️ پنل ادمین'}
        </button>
      </header>

      {/* 🔐 پنل ادمین */}
      {isAdmin && (
        <div className="bg-gray-900 p-6 rounded-2xl mb-8 border border-blue-500/20 max-w-2xl mx-auto shadow-xl">
          <h2 className="text-lg font-bold mb-4 text-blue-400">جستجو و اضافه کردن اتوماتیک به دیتابیس</h2>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="اسم بازی (مثلاً GTA V)" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-right text-sm"
            />
            <button onClick={searchGames} className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-bold transition text-sm">
              جستجو
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="grid grid-cols-1 gap-3 mt-4 bg-gray-950 p-3 rounded-xl max-h-64 overflow-y-auto border border-gray-800">
              {searchResults.map(game => (
                <div key={game.id} className="flex items-center justify-between bg-gray-900 p-3 rounded-lg border border-gray-800">
                  <div className="flex items-center gap-3">
                    <img src={game.background_image} alt={game.name} className="w-12 h-12 object-cover rounded-lg" />
                    <span className="text-sm font-semibold text-gray-200">{game.name}</span>
                  </div>
                  <button 
                    disabled={loading}
                    onClick={() => addGameToSite(game)} 
                    className="bg-green-600 hover:bg-green-700 text-xs px-3 py-1.5 rounded-lg font-medium transition disabled:bg-gray-600"
                  >
                    {loading ? 'در حال ذخیره...' : '+ اضافه به دیتابیس'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 🌐 نمایش اصلی سایت */}
      {!selectedGame ? (
        <div>
          <h2 className="text-lg font-bold mb-6 text-gray-400 mr-2">بازی‌های موجود در دیتاسنتر ({myGames.length})</h2>
          {myGames.length === 0 ? (
            <div className="text-center py-20 bg-gray-900/50 rounded-2xl border border-dashed border-gray-800">
              <p className="text-gray-500">دیتابیس خالی است. از پنل ادمین بازی اضافه کنید تا در سرور ذخیره شود.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {myGames.map(game => (
                <div 
                  key={game.id} 
                  onClick={() => setSelectedGame(game)}
                  className="bg-gray-900 rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.03] transition-all duration-200 border border-gray-800 hover:border-gray-700 shadow-lg group"
                >
                  <div className="relative overflow-hidden">
                    <img src={game.background_image} alt={game.name} className="w-full h-44 md:h-52 object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-sm truncate text-right text-gray-200">{game.name}</h3>
                    <div className="flex justify-between items-center mt-2" dir="ltr">
                      <span className="text-xs text-gray-400">{game.released?.split('-')[0] || '---'}</span>
                      <span className="text-xs bg-gray-800 text-yellow-500 px-2 py-0.5 rounded-md font-bold">⭐ {game.rating}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* 📄 صفحه اختصاصی بازی */
        <div className="bg-gray-900 rounded-3xl p-4 md:p-8 max-w-5xl mx-auto border border-gray-800 shadow-2xl">
          <button 
            onClick={() => setSelectedGame(null)} 
            className="mb-6 text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2 transition bg-gray-800 px-4 py-2 rounded-xl"
          >
            ← بازگشت به لیست اصلی
          </button>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-1">
              <img src={selectedGame.background_image} alt={selectedGame.name} className="w-full h-64 md:h-80 object-cover rounded-2xl shadow-xl border border-gray-800" />
            </div>
            
            <div className="lg:col-span-2 text-right flex flex-col justify-between">
              <div>
                <h2 className="text-2xl md:text-3xl font-black mb-4 text-white">{selectedGame.name}</h2>
                <div className="grid grid-cols-2 gap-4 bg-gray-950 p-4 rounded-xl border border-gray-800 text-sm">
                  <p className="text-gray-400">🕒 مدت زمان اتمام: <span className="text-white font-bold">{selectedGame.playtime || '---'} ساعت</span></p>
                  <p className="text-gray-400">📅 تاریخ انتشار: <span className="text-white font-bold">{selectedGame.released}</span></p>
                  <p className="text-gray-400">⭐ امتیاز منتقدین: <span className="text-yellow-500 font-bold">{selectedGame.rating} / 5</span></p>
                  <p className="text-gray-400">🏷️ ژانرها: <span className="text-blue-400 font-bold">{selectedGame.genres?.map(g => g.name).join(', ') || 'نامشخص'}</span></p>
                </div>
              </div>

              {/* سیستم PC */}
              <div className="mt-6 bg-gray-950 p-4 rounded-xl border border-gray-800 text-left" dir="ltr">
                <h3 className="text-sm font-bold text-gray-400 text-right mb-2">🖥️ سیستم مورد نیاز (PC)</h3>
                {getPcRequirements(selectedGame) ? (
                  <div className="text-xs text-gray-300 space-y-2 max-h-40 overflow-y-auto pr-2">
                    {getPcRequirements(selectedGame)?.minimum && <p className="bg-gray-900 p-2 rounded"><strong className="text-red-400">Minimum:</strong> {getPcRequirements(selectedGame)?.minimum}</p>}
                    {getPcRequirements(selectedGame)?.recommended && <p className="bg-gray-900 p-2 rounded"><strong className="text-green-400">Recommended:</strong> {getPcRequirements(selectedGame)?.recommended}</p>}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 text-center py-2">اطلاعات سیستم مورد نیاز ثبت نشده است.</p>
                )}
              </div>
            </div>
          </div>

          {/* تصاویر */}
          {selectedGame.short_screenshots && selectedGame.short_screenshots.length > 1 && (
            <div className="mt-8 pt-6 border-t border-gray-800">
              <h3 className="text-lg font-bold mb-4 text-gray-300 text-right">📸 گالری تصاویر بازی</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {selectedGame.short_screenshots.slice(1).map(img => (
                  <a href={img.image} target="_blank" rel="noreferrer" key={img.id} className="overflow-hidden rounded-xl border border-gray-800 hover:border-gray-600 transition">
                    <img src={img.image} alt="screenshot" className="w-full h-32 md:h-40 object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
