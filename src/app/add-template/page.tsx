"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";

interface Slot {
  x: number;
  y: number;
  w: number;
  h: number;
}


interface TemplateConfig {
  id: string;
  name: string;
  image: string;
  width: number;
  height: number;
  slots: Slot[];
}

export default function AddTemplatePage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [templateName, setTemplateName] = useState("Template Baru");
  const [imageDims, setImageDims] = useState<{ width: number; height: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setSlots([]);
    setSelectedSlot(null);
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const { naturalWidth, naturalHeight } = img;
    setImageDims({ width: naturalWidth, height: naturalHeight });

    const containerW = 800;
    const scale = Math.min(1, containerW / naturalWidth);
    setScale(scale);
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    setDrawStart(coords);
    setCurrentRect({ x: coords.x, y: coords.y, w: 0, h: 0 });
    setSelectedSlot(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !drawStart) return;
    const coords = getCanvasCoords(e);
    const w = coords.x - drawStart.x;
    const h = coords.y - drawStart.y;
    setCurrentRect({
      x: w < 0 ? coords.x : drawStart.x,
      y: h < 0 ? coords.y : drawStart.y,
      w: Math.abs(w),
      h: Math.abs(h)
    });
  };

  const handleMouseUp = () => {
    if (isDrawing && currentRect && currentRect.w > 10 && currentRect.h > 10) {
      setSlots(prev => [...prev, { ...currentRect }]);
    }
    setIsDrawing(false);
    setDrawStart(null);
    setCurrentRect(null);
  };

  const updateSlot = (index: number, updates: Partial<Slot>) => {
    setSlots(prev => prev.map((slot, i) => i === index ? { ...slot, ...updates } : slot));
  };

  const deleteSlot = (index: number) => {
    setSlots(prev => prev.filter((_, i) => i !== index));
    if (selectedSlot === index) setSelectedSlot(null);
  };

  const clearAll = () => {
    setSlots([]);
    setSelectedSlot(null);
  };

  const generateConfig = (): TemplateConfig => {
    if (!imageFile || !imageDims) throw new Error("Image required");
    const id = `template-${Date.now()}`;
    const ext = imageFile.name.split('.').pop()?.toLowerCase() || 'png';
    const filename = `${id}.${ext}`;
    return {
      id,
      name: templateName,
      image: `/templates/${filename}`,
      width: imageDims.width,
      height: imageDims.height,
      slots
    };
  };

  const copyConfigToClipboard = () => {
    try {
      const config = generateConfig();
      const json = JSON.stringify([config], null, 2);
      navigator.clipboard.writeText(json);
      alert("Config JSON berhasil disalin ke clipboard!\n\nJangan lupa:\n1. Upload gambar ke public/templates/\n2. Paste config ke src/config/templates.ts");
    } catch (e) {
      alert("Gagal menyalin config.");
    }
  };

  const downloadConfigFile = () => {
    try {
      const config = generateConfig();
      const json = JSON.stringify([config], null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template-config-${config.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Gagal download config.");
    }
  };

  if (!imageUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-brand-pink/20 via-white to-brand-magenta/10 p-8">
        <div className="max-w-xl w-full bg-white/80 backdrop-blur-2xl border-2 border-white/60 shadow-2xl rounded-3xl p-8 text-center">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-magenta to-brand-pink mb-4">
            Add New Template
          </h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Upload gambar template frame photobooth, lalu klik & drag untuk define slot di mana foto akan ditempatkan.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-8 py-4 bg-gradient-to-r from-brand-magenta to-brand-pink text-white font-bold rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all text-lg"
          >
            Pilih Gambar Template
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 lg:p-8 bg-gradient-to-b from-brand-pink/20 via-white to-brand-magenta/10">
      <div className="max-w-6xl w-full bg-white/80 backdrop-blur-2xl border-2 border-white/60 shadow-2xl rounded-3xl p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Template Editor</h1>
            <p className="text-gray-600 text-sm mt-1">Define slots by clicking & dragging on the image</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={clearAll} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm">Clear All</button>
            <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium text-sm">Upload Different</button>
            <button onClick={copyConfigToClipboard} className="px-4 py-2 bg-brand-magenta text-white rounded-lg hover:bg-brand-magenta/80 font-medium text-sm">Copy JSON</button>
            <button onClick={downloadConfigFile} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm">Download JSON</button>
          </div>
        </div>

        {/* Template Info */}
        <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Template Name</label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-magenta focus:border-transparent"
              placeholder="Nama template"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Width</label>
              <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700">{imageDims?.width || 0} px</div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Height</label>
              <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700">{imageDims?.height || 0} px</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Canvas Area */}
          <div className="flex-1">
            <div
              className="relative overflow-auto border-2 border-gray-300 rounded-xl bg-gray-100 cursor-crosshair"
              style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.02) 10px, rgba(0,0,0,0.02) 20px)' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Template"
                  onLoad={handleImageLoad}
                  className="block"
                  style={{ width: imageDims?.width, height: imageDims?.height }}
                  draggable={false}
                />
              </div>

              {/* Existing Slots */}
              {slots.map((slot, idx) => (
                <div
                  key={idx}
                  className={`absolute border-4 cursor-pointer transition-colors ${selectedSlot === idx ? 'border-brand-magenta bg-brand-magenta/20' : 'border-green-500 bg-green-500/10 hover:border-green-600'}`}
                  style={{
                    left: slot.x * scale,
                    top: slot.y * scale,
                    width: slot.w * scale,
                    height: slot.h * scale
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSlot(idx);
                  }}
                  title={`Slot ${idx + 1}: ${Math.round(slot.w)}x${Math.round(slot.h)}`}
                >
                  <div className="absolute top-0 left-0 bg-green-500 text-white text-[10px] px-1 font-bold">{idx + 1}</div>
                </div>
              ))}

              {/* Current Drawing Rect */}
              {isDrawing && currentRect && (
                <div
                  className="absolute border-4 border-blue-500 bg-blue-500/20 pointer-events-none"
                  style={{
                    left: currentRect.x * scale,
                    top: currentRect.y * scale,
                    width: currentRect.w * scale,
                    height: currentRect.h * scale
                  }}
                />
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Scale: {(scale * 100).toFixed(0)}% | {slots.length} slot(s) defined
            </p>
          </div>

          {/* Slot List */}
          <div className="lg:w-80 space-y-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <h2 className="font-bold text-gray-800 mb-3">Slots ({slots.length})</h2>
              {slots.length === 0 ? (
                <p className="text-gray-500 text-sm italic">Click & drag on image to create slots</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {slots.map((slot, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedSlot === idx ? 'border-brand-magenta bg-brand-magenta/10' : 'border-gray-200 bg-white hover:border-brand-magenta'}`}
                      onClick={() => setSelectedSlot(idx)}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-gray-700">Slot {idx + 1}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSlot(idx);
                          }}
                          className="text-red-500 hover:text-red-700 text-sm font-medium"
                        >
                          Hapus
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div>
                          <label className="block text-gray-500">X</label>
                          <input
                            type="number"
                            value={Math.round(slot.x)}
                            onChange={(e) => updateSlot(idx, { x: Number(e.target.value) })}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500">Y</label>
                          <input
                            type="number"
                            value={Math.round(slot.y)}
                            onChange={(e) => updateSlot(idx, { y: Number(e.target.value) })}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500">Width</label>
                          <input
                            type="number"
                            value={Math.round(slot.w)}
                            onChange={(e) => updateSlot(idx, { w: Number(e.target.value) })}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500">Height</label>
                          <input
                            type="number"
                            value={Math.round(slot.h)}
                            onChange={(e) => updateSlot(idx, { h: Number(e.target.value) })}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* JSON Preview */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <h2 className="font-bold text-gray-800 mb-2">Config Preview</h2>
              <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto max-h-64">
                {JSON.stringify([generateConfig()], null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 p-4 rounded-xl border border-blue-200">
          <h3 className="font-bold text-blue-800 mb-2">Cara Pakai:</h3>
          <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
            <li>Upload gambar template (PNG dengan transparansi di slot foto)</li>
            <li>Klik & drag trên gambar untuk menggambar slot (area dimana foto akan ditampilkan)</li>
            <li>Klik slot untuk select, lalu edit angka atau hapus</li>
            <li>Copy JSON config dan paste ke <code className="bg-blue-100 px-1 rounded">src/config/templates.ts</code></li>
            <li>Upload file gambar ke <code className="bg-blue-100 px-1 rounded">public/templates/</code> dengan nama sesuai <code className="bg-blue-100 px-1 rounded">image</code> field</li>
          </ol>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}

