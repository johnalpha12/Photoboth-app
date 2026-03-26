"use client";

import { useEffect, useRef, useState } from "react";
import { Template } from "@/config/templates";

interface PhotoboothPreviewProps {
  template: Template;
  photos: string[];
  onReset: () => void;
}

type Transform = { x: number; y: number; scale: number };
type ImgSize = { w: number; h: number };

const FILTERS = [
  { id: 'normal', name: 'Normal', css: 'none' },
  { id: 'classic', name: 'Hitam Putih', css: 'grayscale(100%)' },
  { id: 'sepia', name: 'Vintage', css: 'sepia(100%)' },
  { id: 'negative', name: 'Negatif', css: 'invert(100%)' },
  { id: 'vivid', name: 'Cerah', css: 'contrast(120%) saturate(150%)' },
];

export default function PhotoboothPreview({ template, photos, onReset }: PhotoboothPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [mode, setMode] = useState<'filter' | 'layout'>('filter');
  const [selectedFilter, setSelectedFilter] = useState('normal');
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [transforms, setTransforms] = useState<Transform[]>(
    photos.map(() => ({ x: 0, y: 0, scale: 1 }))
  );
  // Simpan ukuran natural setiap foto setelah load
  const [imgSizes, setImgSizes] = useState<ImgSize[]>(
    photos.map(() => ({ w: 1, h: 1 }))
  );

  // Load ukuran natural foto saat pertama render
  useEffect(() => {
    photos.forEach((src, i) => {
      const img = new window.Image();
      img.onload = () => {
        setImgSizes(prev => {
          const next = [...prev];
          next[i] = { w: img.naturalWidth, h: img.naturalHeight };
          return next;
        });
      };
      img.src = src;
    });
  }, [photos]);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const mobile = window.innerWidth < 1024;
        setIsMobile(mobile);

        let availableW = containerRef.current.clientWidth;
        if (availableW === 0) availableW = window.innerWidth - 32;

        if (mobile) {
          setPreviewScale(availableW / template.width);
        } else {
          const availableH = window.innerHeight * 0.85;
          const scaleW = availableW / template.width;
          const scaleH = availableH / template.height;
          setPreviewScale(Math.min(scaleW, scaleH));
        }
      }
    };

    updateScale();
    setTimeout(updateScale, 100);
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [template]);

  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, tX: 0, tY: 0 });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, index: number) => {
    setActiveSlotIndex(index);
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      tX: transforms[index].x,
      tY: transforms[index].y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>, index: number) => {
    if (!isDragging || activeSlotIndex !== index) return;
    const dx = (e.clientX - dragStart.current.x) / previewScale;
    const dy = (e.clientY - dragStart.current.y) / previewScale;

    setTransforms(prev => {
      const newT = [...prev];
      newT[index] = { ...newT[index], x: dragStart.current.tX + dx, y: dragStart.current.tY + dy };
      return newT;
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const updateTransform = (index: number, patch: Partial<Transform>) => {
    setTransforms(prev => {
      const newT = [...prev];
      newT[index] = { ...newT[index], ...patch };
      return newT;
    });
  };

  /**
   * Hitung dimensi render foto agar:
   * - Width = lebar slot (memenuhi lebar frame)
   * - Height = mengikuti rasio asli foto (tidak terpotong)
   * - Scale dari transform diterapkan di atas ukuran ini
   */
  const calcFitWidth = (slotW: number, slotH: number, imgW: number, imgH: number, t: Transform) => {
    const imgRatio = imgW / imgH;
    const slotRatio = slotW / slotH;

    let renderW: number, renderH: number;

    if (imgRatio >= slotRatio) {
      // Foto lebih lebar atau sama → fit height agar foto memenuhi tinggi slot
      renderH = slotH;
      renderW = imgW * (slotH / imgH);
    } else {
      // Foto lebih tinggi → fit width agar foto memenuhi lebar slot
      renderW = slotW;
      renderH = imgH * (slotW / imgW);
    }

    // Terapkan scale
    const finalW = renderW * t.scale;
    const finalH = renderH * t.scale;

    // Offset agar foto di tengah slot
    const offsetX = (slotW - finalW) / 2 + t.x;
    const offsetY = (slotH - finalH) / 2 + t.y;

    return { finalW, finalH, offsetX, offsetY };
  };

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const handleDownload = async () => {
    setIsProcessing(true);
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = template.width;
    canvas.height = template.height;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    try {
      const templateImg = await loadImage(template.image);
      const photoImgs = await Promise.all(photos.map(src => loadImage(src)));

      ctx.filter = FILTERS.find(f => f.id === selectedFilter)?.css || 'none';

      template.slots.forEach((slot, index) => {
        const img = photoImgs[index];
        if (!img) return;

        const { finalW, finalH, offsetX, offsetY } = calcFitWidth(
          slot.w, slot.h,
          img.naturalWidth, img.naturalHeight,
          transforms[index]
        );

        ctx.save();
        // Tidak ada clip → foto tidak terpotong
        ctx.drawImage(img, slot.x + offsetX, slot.y + offsetY, finalW, finalH);
        ctx.restore();
      });

      ctx.filter = 'none';
      // Frame di atas foto — menutupi area luar slot
      ctx.drawImage(templateImg, 0, 0, template.width, template.height);

      const link = document.createElement('a');
      link.download = `jbooth-${template.id}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error(e);
      alert("Gagal memproses gambar. Coba lagi.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center min-h-screen relative p-4 lg:p-8 text-brand-navy gap-6 lg:gap-8 w-full">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 bg-gradient-to-b from-brand-pink/20 via-brand-offwhite to-brand-magenta/10" />

      {/* LEFT: Preview */}
      <div
        ref={containerRef}
        className="w-full lg:flex-1 relative flex justify-center lg:items-center shrink-0"
        style={{
          height: isMobile ? `${template.height * previewScale}px` : '85vh',
          minHeight: isMobile ? `${template.height * previewScale}px` : 'auto',
        }}
      >
        <canvas ref={canvasRef} className="hidden" />

        {/* Wrapper frame — TIDAK overflow-hidden agar foto tidak terpotong */}
        <div
          style={{
            width: template.width,
            height: template.height,
            transform: `scale(${previewScale})`,
            transformOrigin: isMobile ? 'top center' : 'center center',
          }}
          className={`absolute ${!isMobile ? 'lg:relative' : ''} bg-white shadow-2xl transition-transform duration-300`}
        >
          <div className="absolute inset-0 z-10">
            {template.slots.map((slot, i) => {
              const size = imgSizes[i];
              const t = transforms[i];
              const { finalW, finalH, offsetX, offsetY } = calcFitWidth(
                slot.w, slot.h,
                size.w, size.h,
                t
              );

              return (
                <div
                  key={i}
                  // TIDAK overflow-hidden → foto tidak terpotong
                  className="absolute"
                  style={{
                    left: slot.x,
                    top: slot.y,
                    width: slot.w,
                    height: slot.h,
                    cursor: activeSlotIndex === i ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
                  }}
                  onPointerDown={(e) => handlePointerDown(e, i)}
                  onPointerMove={(e) => handlePointerMove(e, i)}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                >
                  {/*
                    Foto dirender dengan ukuran & posisi yang dihitung manual:
                    - finalW / finalH = ukuran foto setelah fit + scale
                    - offsetX / offsetY = posisi tengah + drag offset
                    - Tidak pakai objectFit sama sekali
                    - Frame template (z-20) menutupi bagian foto yang keluar slot
                  */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photos[i]}
                    alt={`Slot ${i + 1}`}
                    draggable={false}
                    style={{
                      position: 'absolute',
                      width: finalW,
                      height: finalH,
                      left: offsetX,
                      top: offsetY,
                      filter: FILTERS.find(f => f.id === selectedFilter)?.css,
                      userSelect: 'none',
                    }}
                  />
                  {activeSlotIndex === i && (
                    <div className="absolute inset-0 border-[6px] border-brand-magenta shadow-[inset_0_0_30px_rgba(152,37,152,0.4)] pointer-events-none z-10" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Frame template — z-20 menutupi area di luar slot */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={template.image}
            className="absolute inset-0 w-full h-full pointer-events-none z-20"
            alt="frame"
          />
        </div>
      </div>

      {/* RIGHT: Controls */}
      <div className="w-full lg:w-[400px] flex flex-col bg-white/80 backdrop-blur-2xl rounded-[2rem] border-2 border-white/80 shadow-xl shrink-0 lg:h-fit lg:max-h-[85vh] overflow-hidden mb-10 lg:mb-0 z-40">

        <div className="flex-1 overflow-y-auto p-6 lg:p-8 flex flex-col gap-5 pb-4">
          <div className="text-center lg:text-left shrink-0">
            <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-magenta to-brand-navy mb-1">
              Sesuaikan Fotomu ✨
            </h2>
            <p className="text-brand-navy/60 font-medium text-sm leading-relaxed">
              Pilih filter atau geser foto agar pas di kerta fotonya.
            </p>
          </div>

          <div className="flex bg-brand-offwhite rounded-full p-1.5 border border-brand-pink/30 shadow-inner shrink-0">
            <button
              className={`flex-1 py-2.5 rounded-full font-bold transition-all ${mode === 'filter' ? 'bg-white text-brand-magenta border border-brand-pink/20 shadow-md transform scale-[1.02]' : 'text-brand-navy/60 hover:text-brand-navy hover:bg-white/50'}`}
              onClick={() => setMode('filter')}
            >
              Filter
            </button>
            <button
              className={`flex-1 py-2.5 rounded-full font-bold transition-all ${mode === 'layout' ? 'bg-white text-brand-magenta border border-brand-pink/20 shadow-md transform scale-[1.02]' : 'text-brand-navy/60 hover:text-brand-navy hover:bg-white/50'}`}
              onClick={() => { setMode('layout'); if (activeSlotIndex === null) setActiveSlotIndex(0); }}
            >
              Tata Letak
            </button>
          </div>

          <div className="flex-1 w-full flex flex-col shrink-0 min-h-[260px]">
            {mode === 'filter' ? (
              <div className="grid grid-cols-3 gap-3">
                {FILTERS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFilter(f.id)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border-2 ${selectedFilter === f.id ? 'border-brand-magenta bg-brand-pink/10 shadow-md' : 'border-transparent bg-brand-offwhite hover:bg-brand-pink/20 hover:border-brand-pink/30 shadow-sm'}`}
                  >
                    <div
                      className="w-14 h-14 rounded-full border-2 border-white shadow-md bg-center bg-cover"
                      style={{ backgroundImage: `url(${photos[0] || ''})`, filter: f.css }}
                    />
                    <span className="text-xs font-bold text-brand-navy">{f.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex flex-wrap gap-2">
                  {template.slots.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveSlotIndex(i)}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all border-2 shadow-sm ${activeSlotIndex === i ? 'border-brand-magenta bg-brand-magenta text-white shadow-md transform scale-105' : 'border-brand-pink/30 bg-white text-brand-navy hover:bg-brand-offwhite hover:border-brand-pink/50'}`}
                    >
                      Foto Ke-{i + 1}
                    </button>
                  ))}
                </div>

                {activeSlotIndex !== null && (
                  <div className="flex flex-col gap-5 bg-brand-offwhite/50 p-5 rounded-2xl border border-brand-pink/40 shadow-inner">
                    <div className="flex items-center justify-between bg-white px-4 py-2 rounded-xl border border-brand-pink/20 shadow-sm">
                      <span className="font-bold text-sm text-brand-navy">Zoom</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateTransform(activeSlotIndex, { scale: Math.max(0.5, transforms[activeSlotIndex].scale - 0.1) })} className="w-8 h-8 font-extrabold text-xl text-brand-magenta hover:bg-brand-offwhite rounded-lg active:scale-90 transition-transform">-</button>
                        <span className="w-10 text-center text-xs font-bold text-brand-navy/70">{Math.round(transforms[activeSlotIndex].scale * 100)}%</span>
                        <button onClick={() => updateTransform(activeSlotIndex, { scale: Math.min(3, transforms[activeSlotIndex].scale + 0.1) })} className="w-8 h-8 font-extrabold text-xl text-brand-magenta hover:bg-brand-offwhite rounded-lg active:scale-90 transition-transform">+</button>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-3 w-full">
                      <span className="font-bold text-sm text-brand-navy self-start ml-2">Geser Posisi</span>
                      <div className="grid grid-cols-3 gap-2 w-fit">
                        <div />
                        <button onClick={() => updateTransform(activeSlotIndex, { y: transforms[activeSlotIndex].y - 20 })} className="w-12 h-12 flex items-center justify-center bg-white border border-brand-pink/30 text-brand-magenta rounded-xl shadow-sm hover:bg-brand-magenta hover:text-white transition-all active:scale-90">⬆️</button>
                        <div />
                        <button onClick={() => updateTransform(activeSlotIndex, { x: transforms[activeSlotIndex].x - 20 })} className="w-12 h-12 flex items-center justify-center bg-white border border-brand-pink/30 text-brand-magenta rounded-xl shadow-sm hover:bg-brand-magenta hover:text-white transition-all active:scale-90">⬅️</button>
                        <button onClick={() => updateTransform(activeSlotIndex, { x: 0, y: 0, scale: 1 })} className="w-12 h-12 flex items-center justify-center bg-brand-pink/20 border border-brand-magenta text-brand-navy font-bold text-[10px] rounded-xl shadow-sm hover:bg-brand-magenta hover:text-white transition-all active:scale-90">RESET</button>
                        <button onClick={() => updateTransform(activeSlotIndex, { x: transforms[activeSlotIndex].x + 20 })} className="w-12 h-12 flex items-center justify-center bg-white border border-brand-pink/30 text-brand-magenta rounded-xl shadow-sm hover:bg-brand-magenta hover:text-white transition-all active:scale-90">➡️</button>
                        <div />
                        <button onClick={() => updateTransform(activeSlotIndex, { y: transforms[activeSlotIndex].y + 20 })} className="w-12 h-12 flex items-center justify-center bg-white border border-brand-pink/30 text-brand-magenta rounded-xl shadow-sm hover:bg-brand-magenta hover:text-white transition-all active:scale-90">⬇️</button>
                        <div />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 p-6 lg:p-8 pt-4 bg-white/40 border-t border-brand-pink/30 shrink-0 mt-auto">
          <button
            onClick={handleDownload}
            disabled={isProcessing}
            className="w-full py-4 bg-gradient-to-r from-brand-magenta to-brand-pink text-white font-extrabold rounded-xl hover:shadow-[0_8px_25px_rgba(152,37,152,0.4)] hover:-translate-y-1 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none flex justify-center gap-2 items-center text-lg shadow-md"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Menyiapkan Foto...
              </span>
            ) : (
              <><span>⬇</span> Unduh Foto Akhir</>
            )}
          </button>

          <button
            onClick={onReset}
            className="w-full py-3 bg-white border-2 border-brand-pink/40 text-brand-navy rounded-xl font-bold hover:bg-brand-offwhite hover:border-brand-magenta transition-all"
          >
            &larr; Coba Lagi
          </button>
        </div>
      </div>
    </div>
  );
}
