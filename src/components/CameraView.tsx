"use client";

import { useEffect, useRef, useState } from "react";
import { Template } from "@/config/templates";

interface CameraViewProps {
  template: Template;
  onCaptureComplete: (photos: string[]) => void;
  onCancel: () => void;
}

export default function CameraView({ template, onCaptureComplete, onCancel }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const totalPhotos = template.slots.length;

  useEffect(() => {
    // Start camera when component mounts
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Gagal mengakses kamera. Pastikan Anda memberikan izin akses kamera.");
      }
    }

    startCamera();

    // Cleanup function to stop camera when unmounted
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const takeSequence = async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    
    const photos: string[] = [];
    
    for (let i = 0; i < totalPhotos; i++) {
      // 3-second countdown for each photo
      for (let c = 3; c > 0; c--) {
        setCountdown(c);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Capture the photo
      setCountdown(null);
      
      if (videoRef.current && canvasRef.current) {
        // Here we could flash the screen briefly
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // Match canvas to video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        if (ctx) {
          // Mirror the image horizontally because facingMode: 'user' creates a mirrored feed natively, 
          // so capturing it directly would save a mirrored image incorrectly.
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          photos.push(dataUrl);
          setCapturedPhotos([...photos]); // Update UI with thumbnails
        }
      }
      
      // Short pause between photos
      if (i < totalPhotos - 1) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }
    
    setIsCapturing(false);
    
    // Slight delay before completing to let user see the final thumbnail
    setTimeout(() => {
      onCaptureComplete(photos);
    }, 1000);
  };

  return (
    <div className="flex flex-col items-center min-h-screen relative p-4 sm:p-8 text-brand-navy overflow-hidden">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 bg-gradient-to-b from-brand-pink/20 via-brand-offwhite to-brand-magenta/10"></div>
      
      <div className="w-full max-w-4xl flex items-center justify-between mb-6 bg-white/70 backdrop-blur-xl border-2 border-white/60 shadow-sm rounded-full px-6 py-3">
        <button 
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 bg-white text-brand-navy hover:text-brand-magenta hover:bg-brand-pink/10 rounded-full font-bold shadow-sm transition-all border border-brand-pink/40"
        >
          <span>&larr;</span> Kembali
        </button>
        <div className="font-medium text-brand-navy/80">
          <span className="bg-brand-pink/20 text-brand-magenta px-3 py-1 rounded-full font-bold text-sm mr-2">
            {capturedPhotos.length}/{totalPhotos}
          </span>
          <span className="hidden sm:inline">Pose untuk frame: <strong>{template.name}</strong></span>
        </div>
      </div>

      <div className="relative w-full max-w-4xl aspect-video bg-white rounded-[2.5rem] overflow-hidden border-[8px] border-white shadow-[0_10px_40px_rgba(228,145,201,0.25)] flex items-center justify-center">
        {!stream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-brand-offwhite z-10 gap-4">
            <div className="w-12 h-12 border-4 border-brand-pink border-t-brand-magenta rounded-full animate-spin"></div>
            <p className="text-brand-magenta font-bold animate-pulse">Menyiapkan kamera...</p>
          </div>
        )}
        
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover scale-x-[-1] rounded-[2rem]"
        />
        
        <canvas ref={canvasRef} className="hidden" />

        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-sm z-20 rounded-[2rem]">
            <div className="w-40 h-40 bg-brand-magenta rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(152,37,152,0.4)] animate-bounce border-4 border-white">
              <span className="text-7xl font-extrabold text-white drop-shadow-md">
                {countdown}
              </span>
            </div>
          </div>
        )}

        <div className="absolute bottom-8 left-0 right-0 flex justify-center z-30">
          {!isCapturing && capturedPhotos.length === 0 && (
            <button 
              onClick={takeSequence}
              className="group relative flex items-center justify-center hover:scale-105 transition-transform"
            >
              <div className="absolute inset-0 bg-brand-pink rounded-full blur-md opacity-60 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-20 h-20 rounded-full border-4 border-brand-pink/50 flex items-center justify-center bg-white shadow-xl relative z-10 transition-colors">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-brand-magenta to-brand-pink group-hover:from-brand-navy group-hover:to-brand-magenta flex items-center justify-center text-white text-2xl">
                  📸
                </div>
              </div>
            </button>
          )}
          
          {isCapturing && countdown === null && (
            <div className="px-8 py-3 bg-gradient-to-r from-brand-magenta to-brand-pink text-white font-extrabold rounded-full shadow-[0_5px_20px_rgba(152,37,152,0.3)] text-lg animate-pulse border-2 border-white">
              ✨ Jepret! ✨
            </div>
          )}
        </div>
      </div>

      {/* Thumbnails of captured photos */}
      <div className="mt-8 flex gap-4 w-full max-w-4xl overflow-x-auto justify-center pb-4">
        {Array.from({ length: totalPhotos }).map((_, i) => (
          <div 
            key={i} 
            className={`w-24 sm:w-28 flex-shrink-0 aspect-[3/4] bg-white rounded-2xl overflow-hidden border-[4px] shadow-sm transition-all ${
              capturedPhotos.length === i ? 'border-brand-magenta scale-110 -translate-y-2 shadow-lg shadow-brand-pink/40' : capturedPhotos[i] ? 'border-white rotate-2' : 'border-brand-pink/30 opacity-60'
            }`}
          >
            {capturedPhotos[i] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={capturedPhotos[i]} alt={`Photo ${i+1}`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-brand-navy/30 font-extrabold text-2xl bg-brand-offwhite">
                {i + 1}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
