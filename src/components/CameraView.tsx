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
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const totalPhotos = template.slots.length;

  useEffect(() => {
    async function startCamera() {
      try {
        const isMobile = window.innerWidth < 768;
        const constraints: MediaStreamConstraints = {
          video: { 
            facingMode: { ideal: 'user' },
            width: { ideal: isMobile ? 1080 : 1920 },
            height: { ideal: isMobile ? 1920 : 1080 }
          }
        };
        
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = mediaStream;
        setStream(mediaStream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current) {
              const video = videoRef.current;
              const videoAspect = video.videoWidth / video.videoHeight;
              const containerAspect = isMobile ? 3/4 : 4/3;
              
              const ratioDiff = Math.abs(videoAspect - containerAspect) / containerAspect;
              if (ratioDiff > 0.1) {
                video.style.objectFit = 'contain';
                video.style.backgroundColor = '#000';
              } else {
                video.style.objectFit = 'cover';
              }
            }
          };
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Gagal mengakses kamera. Pastikan Anda memberikan izin akses kamera.");
      }
    }

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []); 

  const takeSequence = async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    
    const photos: string[] = [];
    
    for (let i = 0; i < totalPhotos; i++) {
      for (let c = 3; c > 0; c--) {
        setCountdown(c);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      setCountdown(null);
      
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
          photos.push(dataUrl);
          setCapturedPhotos([...photos]);
        }
      } 
      if (i < totalPhotos - 1) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }
    
    setIsCapturing(false);
    
    setTimeout(() => {
      onCaptureComplete(photos);
    }, 1000);
  };

  return (
    <div className="flex flex-col items-center min-h-[100dvh] relative p-4 sm:p-6 text-brand-navy overflow-hidden">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 bg-gradient-to-b from-brand-pink/20 via-brand-offwhite to-brand-magenta/10"></div>
      
      <div className="w-full max-w-xl flex items-center justify-between mb-4 sm:mb-6 bg-white/70 backdrop-blur-xl border-2 border-white/60 shadow-sm rounded-full px-4 sm:px-6 py-2.5 sm:py-3 z-10">
        <button 
          onClick={onCancel}
          className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white text-brand-navy hover:text-brand-magenta hover:bg-brand-pink/10 rounded-full font-bold shadow-sm transition-all border border-brand-pink/40 text-sm sm:text-base"
        >
          <span>&larr;</span> Kembali
        </button>
        <div className="font-medium text-brand-navy/80 flex items-center">
          <span className="bg-brand-pink/20 text-brand-magenta px-3 py-1.5 rounded-full font-bold text-xs sm:text-sm mr-2 border border-brand-pink/30">
            {capturedPhotos.length}/{totalPhotos}
          </span>
          <span className="hidden sm:inline text-sm">Pose untuk frame: <strong>{template.name}</strong></span>
        </div>
      </div>

      <div 
        className="relative w-full max-w-xl aspect-[3/4] sm:aspect-[4/3] bg-black rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border-[6px] sm:border-[8px] border-white shadow-[0_15px_40px_rgba(40,90,72,0.12)] flex items-center justify-center z-10 shrink-0"
      >
        {!stream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-brand-offwhite z-10 gap-4">
            <div className="w-10 h-10 border-4 border-brand-pink border-t-brand-magenta rounded-full animate-spin"></div>
            <p className="text-brand-magenta font-bold animate-pulse text-sm">Menyiapkan kamera...</p>
          </div>
        )}
        
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full scale-x-[-1] rounded-2xl sm:rounded-[2rem]"
        />
        
        <canvas ref={canvasRef} className="hidden" />

        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-md z-20 rounded-2xl sm:rounded-[2rem]">
            <div className="w-32 h-32 sm:w-40 sm:h-40 bg-brand-magenta rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(40,90,72,0.4)] animate-bounce border-[6px] border-white">
              <span className="text-6xl sm:text-7xl font-extrabold text-white drop-shadow-md">
                {countdown}
              </span>
            </div>
          </div>
        )}

        <div className="absolute bottom-6 sm:bottom-8 left-0 right-0 flex justify-center z-30">
          {!isCapturing && capturedPhotos.length === 0 && (
            <button 
              onClick={takeSequence}
              className="group relative flex items-center justify-center hover:scale-105 transition-transform"
            >
              <div className="absolute inset-0 bg-brand-pink rounded-full blur-md opacity-60 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-brand-pink/50 flex items-center justify-center bg-white shadow-xl relative z-10 transition-colors">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-brand-magenta to-brand-pink group-hover:from-brand-navy group-hover:to-brand-magenta flex items-center justify-center text-white text-xl sm:text-2xl shadow-inner">
                  📸
                </div>
              </div>
            </button>
          )}
          
          {isCapturing && countdown === null && (
            <div className="px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-brand-magenta to-brand-pink text-white font-extrabold rounded-full shadow-[0_5px_20px_rgba(40,90,72,0.3)] text-base sm:text-lg animate-pulse border-2 border-white">
              ✨ Jepret! ✨
            </div>
          )}
        </div>
      </div>

      {/* Thumbnails of captured photos */}
      <div className="mt-4 flex gap-3 sm:gap-4 w-full max-w-xl overflow-x-auto justify-center pt-6 pb-8 px-4 z-10">
        {Array.from({ length: totalPhotos }).map((_, i) => (
          <div 
            key={i} 
            className={`w-20 sm:w-24 shrink-0 aspect-[3/4] bg-white rounded-xl sm:rounded-2xl overflow-hidden border-[3px] sm:border-[4px] shadow-sm transition-all duration-300 ${
              capturedPhotos.length === i ? 'border-brand-magenta scale-110 -translate-y-2 shadow-lg shadow-brand-magenta/30' : capturedPhotos[i] ? 'border-brand-pink/30 hover:rotate-2' : 'border-brand-pink/30 opacity-50 bg-brand-offwhite'
            }`}
          >
            {capturedPhotos[i] ? (
              <img src={capturedPhotos[i]} alt={`Photo ${i+1}`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-brand-navy/30 font-extrabold text-xl sm:text-2xl">
                {i + 1}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
