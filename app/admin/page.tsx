"use client";

import { useState } from "react";
import Link from "next/link";

export default function AdminPage() {
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [platform, setPlatform] = useState("");
  const [image, setImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      setMessage("❌ لطفاً نام بازی را وارد کنید.");
      return;
    }

    setLoading(true);
    setMessage("");

    // تبدیل داده‌های فرم دستی به ساختار استاندارد RAWG برای سازگاری با فرانت‌اند
    const newGame = {
      id: "manual-" + Date.now().toString(),
      name: title,
      background_image: image || "https://placehold.co/600x400?text=" + encodeURIComponent(title),
      rating: 5,
      released: new Date().toISOString().split('T')[0],
      playtime: 0,
      genres: genre ? genre.split('،').map(g => ({ name: g.trim() })) : [{ name: 'نامشخص' }],
      platforms: platform ? platform.split('،').map(p => ({ platform: { name: p.trim() } })) : [],
      short_screenshots: []
    };

    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newGame),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("✅ بازی با موفقیت در دیتابیس کلودفلر ذخیره شد!");
        setTitle(""); setGenre(""); setPlatform(""); setImage("");
      } else {
        setMessage(`❌ خطا: ${data.error}`);
      }
    } catch (err) {
      setMessage("❌ خطا در برقراری ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6" dir="rtl">
      <div className="max-w-md mx-auto bg-gray-900 rounded-2xl p-6 shadow-2xl border border-gray-800">
        <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
          <h1 className="text-xl font-bold text-blue-400">🛠️ پنل مدیریت بازی‌ها</h1>
          <Link href="/" className="bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-xl text-xs transition border border-gray-700">
            بازگشت به سایت
          </Link>
        </div>

        {message && <div className="mb-4 p-3 rounded-xl bg-gray-800 text-center text-xs font-semibold border border-gray-700">{message}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">نام بازی *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="مثلا: GTA V" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">ژانرها (با ، ویرگول جدا کنید)</label>
            <input type="text" value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="مثلا: اکشن، جهان باز" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">پلتفرم‌ها (با ، ویرگول جدا کنید)</label>
            <input type="text" value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="مثلا: PC، PS5" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">لینک عکس کاور (اختیاری)</label>
            <input type="text" value={image} onChange={(e) => setImage(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500 text-left" placeholder="https://example.com/image.jpg" dir="ltr" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold py-3 px-4 rounded-xl transition text-sm mt-4 shadow-lg shadow-blue-500/20">
            {loading ? "در حال ذخیره..." : "➕ افزودن به دیتابیس کلودفلر"}
          </button>
        </form>
      </div>
    </div>
  );
}
