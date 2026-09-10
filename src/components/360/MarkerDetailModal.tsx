import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';

interface MarkerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'poi' | 'damage';
  title: string;
  description?: string;
  category?: string;
  frameNumber?: number;
  images: { url: string; order: number }[];
}

export function MarkerDetailModal({ isOpen, onClose, type, title, description, category, frameNumber, images }: MarkerDetailModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && images.length > 1) {
      setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
    }
    if (isRightSwipe && images.length > 1) {
      setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setImageError(false);
      const previousOverflow = document.body.style.overflow;
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
        if (images.length > 1) {
          if (e.key === 'ArrowLeft') setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
          if (e.key === 'ArrowRight') setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
        }
      };
      window.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      return () => {
        window.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = previousOverflow;
      };
    }
  }, [images.length, isOpen, onClose]);

  if (!isOpen) return null;

  const currentImage = images[currentIndex];
  
  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
    setImageError(false);
  };
  
  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
    setImageError(false);
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="marker-detail-title"
        className="relative flex max-h-[88dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:max-h-[82dvh] sm:rounded-[28px]"
        onClick={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          aria-label="Fechar detalhes"
          className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/85 focus:outline-none focus:ring-2 focus:ring-white sm:right-4 sm:top-4"
        >
          <X size={24} />
        </button>

        <div className="grid min-h-0 w-full flex-1 grid-rows-[minmax(280px,56dvh)_auto] sm:grid-cols-[minmax(0,1.55fr)_minmax(270px,.65fr)] sm:grid-rows-1">
          {/* Image Section */}
          <div className="relative flex min-h-0 items-center justify-center overflow-hidden bg-slate-950" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
            {images.length > 0 ? (
              <>
                {imageError ? (
                  <div className="text-gray-500 flex flex-col items-center">
                    <ImageIcon size={48} className="mb-2 opacity-50" />
                    <p>Erro ao carregar imagem</p>
                  </div>
                ) : (
                  <img 
                    src={currentImage.url} 
                    alt={title} 
                    className="h-full w-full select-none object-contain"
                    draggable={false}
                    onError={() => setImageError(true)}
                  />
                )}
                
                {images.length > 1 && (
                  <>
                    <button 
                      onClick={handlePrev}
                      aria-label="Imagem anterior"
                      className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button 
                      onClick={handleNext}
                      aria-label="Próxima imagem"
                      className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
                    >
                      <ChevronRight size={24} />
                    </button>
                    
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm text-white backdrop-blur-sm">
                      {currentIndex + 1} / {images.length}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-gray-500 flex flex-col items-center">
                <ImageIcon size={48} className="mb-2 opacity-50" />
                <p>Nenhuma imagem disponível</p>
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="z-10 flex min-h-0 flex-col gap-4 overflow-y-auto border-t border-gray-200 bg-white p-5 sm:border-l sm:border-t-0 sm:p-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium uppercase tracking-wider ${type === 'poi' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                  {type === 'poi' ? 'Ponto de Interesse' : category || 'Avaria'}
                </span>
                {frameNumber !== undefined && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                    Ref: Frame {frameNumber + 1}
                  </span>
                )}
              </div>
              <h3 id="marker-detail-title" className="mb-2 pr-10 text-xl font-bold text-gray-900 sm:text-2xl">{title}</h3>
              {description && (
                <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{description}</p>
              )}
            </div>

            {images.length > 1 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Galeria de Imagens</h4>
                <div className="grid grid-cols-5 gap-2 sm:grid-cols-3">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      aria-label={`Ver imagem ${idx + 1}`}
                      onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); setImageError(false); }}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${idx === currentIndex ? 'border-indigo-600 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'}`}
                    >
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
