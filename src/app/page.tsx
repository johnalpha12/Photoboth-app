"use client";

import { useState } from "react";
import Image from "next/image";
import { templates, Template } from "@/config/templates";
import CameraView from "@/components/CameraView";
import PhotoboothPreview from "@/components/PhotoboothPreview";

type Step = 'select' | 'capture' | 'preview';

export default function Home() {
  const [currentStep, setCurrentStep] = useState<Step>('select');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setCurrentStep('capture');
  };

  const handleCaptureComplete = (photos: string[]) => {
    setCapturedPhotos(photos);
    setCurrentStep('preview');
  };

  const handleReset = () => {
    setCapturedPhotos([]);
    setSelectedTemplate(null);
    setCurrentStep('select');
  };

  const handleRetake = () => {
    setCapturedPhotos([]);
    setCurrentStep('capture');
  };

  if (currentStep === 'capture' && selectedTemplate) {
    return (
      <CameraView 
        template={selectedTemplate} 
        onCaptureComplete={handleCaptureComplete} 
        onCancel={handleReset} 
      />
    );
  }

  if (currentStep === 'preview' && selectedTemplate && capturedPhotos.length > 0) {
    return (
      <PhotoboothPreview 
        template={selectedTemplate} 
        photos={capturedPhotos} 
        onReset={handleRetake} 
      />
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 text-brand-navy overflow-hidden relative">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 bg-gradient-to-b from-brand-pink/20 via-brand-offwhite to-brand-magenta/10"></div>
      
      <div className="w-full max-w-5xl bg-white/70 backdrop-blur-2xl border-2 border-white/60 shadow-[0_8px_32px_rgba(228,145,201,0.25)] rounded-[2.5rem] p-6 sm:p-12 my-auto mt-8 sm:mt-12">
        <div className="text-center mb-10">
          <div className="inline-block bg-white px-6 py-2 rounded-full shadow-sm border border-brand-pink/40 mb-4 transform hover:scale-105 transition-transform duration-300">
            <span className="text-brand-magenta font-bold tracking-widest text-sm uppercase">Welcome to</span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-magenta to-brand-pink drop-shadow-sm mb-4 pb-2">
            ✨ J Booth
          </h1>
          <p className="text-brand-navy/70 font-medium text-lg">Pilih frame favoritmu dan bersiap untuk pose terbaik!</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {templates.map((template) => (
            <div 
              key={template.id} 
              onClick={() => handleTemplateSelect(template)}
              className="group cursor-pointer bg-white/80 backdrop-blur-sm rounded-[2rem] p-5 border-2 border-brand-pink/30 hover:border-brand-magenta hover:shadow-[0_10px_30px_rgba(228,145,201,0.3)] transition-all duration-300 transform hover:-translate-y-2 flex flex-col items-center relative"
            >
              <div className="relative w-full aspect-[1/2] mb-5 bg-white rounded-[1.5rem] overflow-hidden flex items-center justify-center border border-brand-offwhite shadow-inner">
                <Image 
                  src={template.image} 
                  alt={template.name} 
                  fill 
                  className="object-contain p-2 group-hover:scale-105 transition-transform duration-500 drop-shadow-md" 
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <h3 className="text-xl font-bold text-brand-navy mb-3 group-hover:text-brand-magenta transition-colors">{template.name}</h3>
              <span className="bg-brand-pink/20 text-brand-magenta text-sm font-bold px-5 py-1.5 rounded-full shadow-sm">
                {template.slots.length} Pose
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
