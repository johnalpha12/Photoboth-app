"use client";

import { useEffect, useRef, useState } from "react";
import { Template } from "@/config/templates";

interface PhotoboothPreviewProps {
  template: Template;
  photos: string[];
  onReset: () => void;
}

type Transform = { x: number; y: number; scale: number };

const FILTERS = [
  { id: 'normal', name: 'Normal', css: 'none' },
  { id: 'classic', name: 'Hitam Putih', css: 'grayscale(100%)' },
  { id: 'sepia', name: 'Vintage', css: 'sepia(100%)' },
  { id: 'negative', name: 'Negatif', css: 'invert(100%)' },
  { id: 'vivid', name: 'Cerah', css: 'contrast(120%) saturate(150%)' },
  { id: 'newspaper', name: 'Koran', css: 'grayscale(100%) contrast(150%) brightness(90%)' },
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
  const [transforms, setTransforms] = useState<Transform[]>([]);

  useEffect(() => {
    if (transforms.length === photos.length) return;
    
    const newTransforms: Transform[] = [];
    for (let i = 0; i < photos.length; i++) {
      newTransforms.push(transforms[i] ?? { x: 0, y: 0, scale: 1 });
    }
    setTransforms(newTransforms);
  }, [photos.length, transforms]);

  useEffect(() => {
    const storageKey = `photobooth-transforms-${template.id}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === photos.length) {
          setTransforms(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load transforms from localStorage:', e);
    }
    setTransforms(photos.map(() => ({ x: 0, y: 0, scale: 1 })));
  }, [template.id, photos.length]);

  useEffect(() => {
    if (transforms.length === 0) return;
    const storageKey = `photobooth-transforms-${template.id}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(transforms));
    } catch (e) {
      console.warn('Failed to save transforms to localStorage:', e);
    }
  }, [template.id, transforms]);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const mobile = window.innerWidth < 1024;
        setIsMobile(mobile);
        
        let availableW = containerRef.current.clientWidth;
        if (availableW === 0) availableW = window.innerWidth - 32;

        if (mobile) {
          const scaleW = availableW / template.width;
          setPreviewScale(scaleW);
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

  const handlePointerDown = (e: React.PointerEvent<HTMLImageElement>, index: number) => {
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

  const handlePointerMove = (e: React.PointerEvent<HTMLImageElement>, index: number) => {
    if (!isDragging || activeSlotIndex !== index) return;
    const dx = (e.clientX - dragStart.current.x) / previewScale;
    const dy = (e.clientY - dragStart.current.y) / previewScale;
    
    setTransforms(prev => {
      const newT = [...prev];
      newT[index] = { ...newT[index], x: dragStart.current.tX + dx, y: dragStart.current.tY + dy };
      return newT;
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLImageElement>) => {
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

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const drawCustom = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, slotX: number, slotY: number, slotW: number, slotH: number, t: Transform) => {
    const containScale = Math.min(slotW / img.width, slotH / img.height);
    const baseW = img.width * containScale;
    const baseH = img.height * containScale;
    
    const finalW = baseW * t.scale;
    const finalH = baseH * t.scale;
    
    const centerX = slotX + slotW / 2 + t.x;
    const centerY = slotY + slotH / 2 + t.y;
    
    const finalX = centerX - finalW / 2;
    const finalY = centerY - finalH / 2;

    ctx.save();
    ctx.beginPath();
    ctx.rect(slotX, slotY, slotW, slotH);
    ctx.clip();
    ctx.drawImage(img, finalX, finalY, finalW, finalH);
    ctx.restore();
  };

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
        if (photoImgs[index]) {
          drawCustom(ctx, photoImgs[index], slot.x, slot.y, slot.w, slot.h, transforms[index]);
        }
      });

      ctx.filter = 'none';
      ctx.drawImage(templateImg, 0, 0, template.width, template.height);

      const finalDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.download = `jbooth-${template.id}-${Date.now()}.jpg`;
      link.href = finalDataUrl;
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
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 bg-gradient-to-b from-brand-pink/20 via-brand-offwhite to-brand-magenta/10"></div>
      
      {/* LEFT AREA: Preview Box */}
      <div 
        ref={containerRef}
        className="w-full lg:flex-1 relative flex justify-center lg:items-center shrink-0"
        style={{ 
          height: isMobile ? `${template.height * previewScale}px` : '85vh',
          minHeight: isMobile ? `${template.height * previewScale}px` : 'auto'
        }}
      >
        <canvas ref={canvasRef} className="hidden" />

        <div 
          style={{ 
            width: template.width, 
            height: template.height, 
            transform: `scale(${previewScale})`,
            transformOrigin: isMobile ? 'top center' : 'center center'
          }}
          className={`absolute ${!isMobile ? 'lg:relative' : ''} bg-white shadow-2xl transition-transform duration-300 pointer-events-none overflow-hidden`}
        >
          {/* User Photos Interactive Layer */}
          <div className="absolute inset-0 z-10 pointer-events-auto">
            {template.slots.map((slot, i) => (
              <div 
                key={i} 
                className="absolute overflow-hidden bg-brand-offwhite"
                style={{ left: slot.x, top: slot.y, width: slot.w, height: slot.h }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={photos[i]} 
                  alt={`Slot ${i+1}`}
                  draggable={false}
                  onPointerDown={(e) => handlePointerDown(e, i)}
                  onPointerMove={(e) => handlePointerMove(e, i)}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  style={{ 
                    width: '100%', height: '100%', objectFit: 'cover',
                    transform: `translate(${transforms[i]?.x ?? 0}px, ${transforms[i]?.y ?? 0}px) scale(${transforms[i]?.scale ?? 1})`,
                    filter: FILTERS.find(f => f.id === selectedFilter)?.css,
                    cursor: activeSlotIndex === i ? (isDragging ? 'grabbing' : 'grab') : 'pointer'
                  }} 
                  className="transition-[filter] duration-300 origin-center"
                />
                {activeSlotIndex === i && (
                  <div className="absolute inset-0 border-[6px] border-brand-magenta shadow-[inset_0_0_30px_rgba(40,90,72,0.4)] pointer-events-none"></div>
                )}
              </div>
            ))}
          </div>

          <img src={template.image} className="absolute inset-0 w-full h-full pointer-events-none z-20 drop-shadow-sm" alt="frame" />

          {/* Ghost Image overlay */}
          {activeSlotIndex !== null && mode === 'layout' && photos[activeSlotIndex] && (
            <div 
              className="absolute pointer-events-none z-30 opacity-50 mix-blend-luminosity overflow-visible"
              style={{ left: template.slots[activeSlotIndex].x, top: template.slots[activeSlotIndex].y, width: template.slots[activeSlotIndex].w, height: template.slots[activeSlotIndex].h }}
            >
              <div className="absolute inset-0 border-2 border-white border-dashed z-40 opacity-70"></div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={photos[activeSlotIndex]} 
                className="origin-center"
                style={{ 
                  width: '100%', height: '100%', objectFit: 'cover',
                  transform: `translate(${transforms[activeSlotIndex].x}px, ${transforms[activeSlotIndex].y}px) scale(${transforms[activeSlotIndex].scale})`,
                  filter: FILTERS.find(f => f.id === selectedFilter)?.css,
                }} 
              />
            </div>
          )}
        </div>
      </div>

      {/* RIGHT AREA: Editing Controls */}
      <div className="w-full lg:w-[400px] flex flex-col bg-white/80 backdrop-blur-2xl rounded-[2rem] border-2 border-white/80 shadow-xl shrink-0 lg:h-fit lg:max-h-[85vh] overflow-hidden mb-10 lg:mb-0 z-40">
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 flex flex-col gap-5 pb-4">
          <div className="text-center lg:text-left shrink-0">
            <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-magenta to-brand-navy mb-1">
              Sesuaikan Fotomu
            </h2>
            <p className="text-brand-navy/60 font-medium text-sm leading-relaxed">Pilih filter atau geser foto agar pas di kerta fotonya.</p>
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
              onClick={() => { setMode('layout'); if(activeSlotIndex === null) setActiveSlotIndex(0); }}
            >
              Tata Letak
            </button>
          </div>

          <div className="flex-1 w-full flex flex-col shrink-0 min-h-[260px]">
            {mode === 'filter' ? (
              <div className="flex flex-col gap-4">
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
                      <span className="font-bold text-sm text-brand-navy">Zoom (Perbesar)</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateTransform(activeSlotIndex, { scale: Math.max(0.5, transforms[activeSlotIndex].scale - 0.1) })} className="w-8 h-8 font-extrabold text-xl text-brand-magenta hover:bg-brand-offwhite rounded-lg active:scale-90 transition-transform">-</button>
                        <span className="w-10 text-center text-xs font-bold text-brand-navy/70">{Math.round(transforms[activeSlotIndex].scale * 100)}%</span>
                        <button onClick={() => updateTransform(activeSlotIndex, { scale: Math.min(3, transforms[activeSlotIndex].scale + 0.1) })} className="w-8 h-8 font-extrabold text-xl text-brand-magenta hover:bg-brand-offwhite rounded-lg active:scale-90 transition-transform">+</button>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-3 w-full">
                      <span className="font-bold text-sm text-brand-navy self-start ml-2">Geser Posisi</span>
                      <div className="grid grid-cols-3 gap-2 w-fit">
                        <div></div>
                        <button onClick={() => updateTransform(activeSlotIndex, { y: transforms[activeSlotIndex].y - 20 })} className="w-12 h-12 flex items-center justify-center bg-white border border-brand-pink/30 text-brand-magenta rounded-xl shadow-sm hover:bg-brand-magenta hover:text-white transition-all active:scale-90">⬆️</button>
                        <div></div>
                        <button onClick={() => updateTransform(activeSlotIndex, { x: transforms[activeSlotIndex].x - 20 })} className="w-12 h-12 flex items-center justify-center bg-white border border-brand-pink/30 text-brand-magenta rounded-xl shadow-sm hover:bg-brand-magenta hover:text-white transition-all active:scale-90">⬅️</button>
                        <button onClick={() => updateTransform(activeSlotIndex, { x: 0, y: 0, scale: 1 })} className="w-12 h-12 flex items-center justify-center bg-brand-pink/20 border border-brand-magenta text-brand-navy font-bold text-[10px] rounded-xl shadow-sm hover:bg-brand-magenta hover:text-white transition-all active:scale-90">RESET</button>
                        <button onClick={() => updateTransform(activeSlotIndex, { x: transforms[activeSlotIndex].x + 20 })} className="w-12 h-12 flex items-center justify-center bg-white border border-brand-pink/30 text-brand-magenta rounded-xl shadow-sm hover:bg-brand-magenta hover:text-white transition-all active:scale-90">➡️</button>
                        <div></div>
                        <button onClick={() => updateTransform(activeSlotIndex, { y: transforms[activeSlotIndex].y + 20 })} className="w-12 h-12 flex items-center justify-center bg-white border border-brand-pink/30 text-brand-magenta rounded-xl shadow-sm hover:bg-brand-magenta hover:text-white transition-all active:scale-90">⬇️</button>
                        <div></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Submit Actions (Sticky at bottom) */}
        <div className="flex flex-col gap-3 p-6 lg:p-8 pt-4 bg-white/40 border-t border-brand-pink/30 shrink-0 mt-auto">
          <button 
            onClick={handleDownload}
            disabled={isProcessing}
            className="w-full py-4 bg-gradient-to-r from-brand-magenta to-brand-pink text-white font-extrabold rounded-xl hover:shadow-[0_8px_25px_rgba(40,90,72,0.4)] hover:-translate-y-1 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none flex justify-center gap-2 items-center text-lg shadow-md"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> 
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
