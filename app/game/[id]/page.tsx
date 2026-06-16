'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function GameDetails() {
  const { id } = useParams();
  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImgIndex, setActiveImgIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;

    fetch(`/api-store?id=${id}`)
      .then((res) => res.json())
      .then((localData) => {
        if (localData) {
          setGame(localData);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching game details from database:', err);
        setLoading(false);
      });
  }, [id]);

  const closeLightbox = () => setActiveImgIndex(null);
  
  const nextImg = useCallback(() => {
    if (activeImgIndex !== null && game?.short_screenshots) {
      const gallery = game.short_screenshots.slice(1);
      setActiveImgIndex((activeImgIndex + 1) % gallery.length);
    }
  }, [activeImgIndex, game]);

  const prevImg = useCallback(() => {
    if (activeImgIndex !== null && game?.short_screenshots) {
      const gallery = game.short_screenshots.slice(1);
      setActiveImgIndex((activeImgIndex - 1 + gallery.length) % gallery.length);
    }
  }, [activeImgIndex, game]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeImgIndex === null) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') prevImg();
      if (e.key === 'ArrowLeft') nextImg();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeImgIndex, nextImg, prevImg]);

  const getBypassUrl = (url: string) => {
    if (!url) return '';
    const cleanUrl = url.replace(/^https?:\/\//i, '');
    return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=800&q=85`;
  };

  const getHighQualityBypassUrl = (url: string) => {
    if (!url) return '';
    const cleanUrl = url.replace(/^https?:\/\//i, '');
    return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=1920&q=95`;
  };

  const formatAgeRating = (esrb: any) => {
    if (!esrb || !esrb.name) return 'نامشخص';
    const name = esrb.name.toLowerCase();
    const match = esrb.name.match(/\d+/);
    if (match) return `+${match[0]} سال`;
    if (name.includes('everyone')) return '+3 سال';
    if (name.includes('teen')) return '+13 سال';
    if (name.includes('mature')) return '+17 سال';
    if (name.includes('adults')) return '+18 سال';
    return esrb.name;
  };

  const formatRequirements = (reqText: any) => {
    if (!reqText || typeof reqText !== 'string') return [];
    return reqText
      .replace(/Minimum:|Recommended:/gi, '')
      .split(/(?=Processor:|Graphics:|Memory:|OS:|Storage:|DirectX:|Sound Card:|Network:)/i)
      .map(line => line.trim())
      .filter(line => line.length > 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 md:p-12 max-w-5xl mx-auto animate-pulse" dir="rtl">
        <div className="h-10 bg-slate-900 rounded-xl w-40 mb-8"></div>
        <div className="bg-slate-900/50 h-96 rounded-3
