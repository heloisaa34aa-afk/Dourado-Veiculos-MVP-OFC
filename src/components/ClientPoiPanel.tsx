import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useVehicle360 } from '../hooks/useVehicle360';
import { ImageCoordinateStage } from './360/ImageCoordinateStage';
import { ChevronLeft, ChevronRight, Play, Pause, AlertTriangle, Info, Maximize } from 'lucide-react';
import { Vehicle360Hotspot, Vehicle360DamageMarker } from '../types';
import { MarkerDetailModal } from './360/MarkerDetailModal';
import { isImageDecoded, preloadFrameSequence, preloadImage } from '../utils/imagePreloader';

interface ClientPoiPanelProps {
  vehicleId: string;
  embedded?: boolean;
  viewType?: 'exterior' | 'interior';
}

export function ClientPoiPanel({ vehicleId, embedded = false, viewType = 'exterior' }: ClientPoiPanelProps) {
  const { 
    project, 
    loading, 
    currentFrame, 
    isAutoSpinning, 
    toggleAutoSpin,
    isDragging,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    nextFrame,
    prevFrame,
    totalFrames
  } = useVehicle360(vehicleId, 'public', viewType);

  const [activePoi, setActivePoi] = useState<Vehicle360Hotspot | null>(null);
  const [activeDamage, setActiveDamage] = useState<Vehicle360DamageMarker | null>(null);
  const [renderedFrame, setRenderedFrame] = useState(0);
  const [frameReady, setFrameReady] = useState(false);
  const requestedFrameRef = useRef(0);

  const frameUrls = useMemo(() => project?.frames?.map(frame => frame.imageUrl) ?? [], [project]);

  useEffect(() => {
    setRenderedFrame(0);
    setFrameReady(Boolean(frameUrls[0] && isImageDecoded(frameUrls[0])));
    if (frameUrls.length) void preloadFrameSequence(frameUrls, 0, 3);
  }, [frameUrls]);

  useEffect(() => {
    const url = frameUrls[currentFrame];
    if (!url) return;
    requestedFrameRef.current = currentFrame;
    void preloadFrameSequence(frameUrls, currentFrame, 3);
    if (isImageDecoded(url)) {
      setRenderedFrame(currentFrame);
      setFrameReady(true);
      return;
    }
    void preloadImage(url, 'high').then(() => {
      if (requestedFrameRef.current === currentFrame) {
        setRenderedFrame(currentFrame);
        setFrameReady(true);
      }
    }).catch(() => undefined);
  }, [currentFrame, frameUrls]);

  if (loading) {
    return <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-gray-50/50 animate-pulse text-gray-500 rounded-2xl">Carregando visão 360°...</div>;
  }

  if (!project || totalFrames === 0) {
    return null;
  }

  const currentFrameData = project.frames![renderedFrame];
  if (!currentFrameData) return null;

  const currentHotspots = (project.hotspots || []).filter(h => h.active).map(h => {
    const pos = h.positions?.find(p => p.frameNumber === renderedFrame);
    if (pos) { 
      return pos.visible ? { ...h, posX: pos.posX, posY: pos.posY } : null;
    }
    return h.frameNumber === renderedFrame ? h : null;
  }).filter(Boolean) as Vehicle360Hotspot[];

  const currentDamages = (project.damageMarkers || []).map(d => {
    const pos = d.positions?.find(p => p.frameNumber === renderedFrame);
    if (pos) { 
      return pos.visible ? { ...d, posX: pos.posX, posY: pos.posY } : null;
    }
    return d.frameNumber === renderedFrame ? d : null;
  }).filter(Boolean) as Vehicle360DamageMarker[];

  const openPoiModal = (h: Vehicle360Hotspot) => {
    setActivePoi(h);
    setActiveDamage(null);
    if (isAutoSpinning) toggleAutoSpin();
  };

  const openDamageModal = (d: Vehicle360DamageMarker) => {
    setActiveDamage(d);
    setActivePoi(null);
    if (isAutoSpinning) toggleAutoSpin();
  };

  const markers = [
    ...currentHotspots.map(h => ({
      id: h.id,
      x: h.posX,
      y: h.posY,
      content: (
        <button 
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); openPoiModal(h); }}
          className="pointer-events-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-xl transition-transform hover:scale-110"
          aria-label={h.title}
        >
          <Info size={16} />
        </button>
      )
    })),
    ...currentDamages.map(d => ({
      id: d.id,
      x: d.posX,
      y: d.posY,
      content: (
        <button 
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); openDamageModal(d); }}
          className="pointer-events-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-red-600 text-white shadow-xl transition-transform hover:scale-110"
          aria-label={d.title}
        >
          <AlertTriangle size={16} />
        </button>
      )
    }))
  ];

  return (
    <div className={`overflow-hidden bg-[#07090d] text-white shadow-sm flex flex-col ${embedded ? 'w-full h-full' : 'rounded-[28px] border border-white/10'}`}>
      {!embedded && (
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <h3 className="font-bold text-white">Visão 360° do veículo</h3>
          
          <div className="flex gap-2">
            <button onClick={prevFrame} className="p-2 rounded-full hover:bg-gray-100 text-gray-600" aria-label="Frame anterior">
              <ChevronLeft size={20} />
            </button>
            <button onClick={toggleAutoSpin} className="p-2 rounded-full hover:bg-gray-100 text-gray-600" aria-label={isAutoSpinning ? "Pausar giro" : "Giro automático"}>
              {isAutoSpinning ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button onClick={nextFrame} className="p-2 rounded-full hover:bg-gray-100 text-gray-600" aria-label="Próximo frame">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      <div className={`relative flex-1 touch-none bg-[#07090d] ${!embedded ? 'aspect-[4/3] sm:aspect-video' : 'h-full w-full'}`}>
        {!frameReady && <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950 text-sm font-semibold text-white">Preparando giro 360°...</div>}
        <ImageCoordinateStage
          imageUrl={currentFrameData.imageUrl}
          markers={markers}
          className={`w-full h-full cursor-ew-resize object-contain ${embedded ? 'absolute inset-0' : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
        
        <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-white backdrop-blur-md">
          {viewType === 'exterior' ? 'Exterior' : 'Interior'} · {renderedFrame + 1}/{totalFrames}
        </div>

        {embedded && (
           <button onClick={toggleAutoSpin} className="absolute bottom-3 right-3 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-black/60 text-white shadow-lg backdrop-blur transition hover:bg-black/80 sm:bottom-5 sm:right-5" aria-label={isAutoSpinning ? "Pausar giro" : "Giro automático"}>
             {isAutoSpinning ? <Pause size={24} /> : <Play size={24} />}
           </button>
        )}

        <div className="pointer-events-none absolute bottom-3 left-3 right-16 flex sm:bottom-5 sm:left-5">
          <div className="rounded-full border border-white/10 bg-black/55 px-3 py-2 text-xs font-bold text-white shadow-sm backdrop-blur">
            <span>{isDragging ? 'Girando…' : 'Arraste para explorar'}</span>
          </div>
        </div>
      </div>

      <MarkerDetailModal 
        isOpen={!!activePoi}
        onClose={() => setActivePoi(null)}
        type="poi"
        title={activePoi?.title || ''}
        description={activePoi?.description}
        frameNumber={activePoi?.frameNumber}
        images={activePoi?.imageUrl ? [{ url: activePoi.imageUrl, order: 0 }] : []}
      />

      <MarkerDetailModal 
        isOpen={!!activeDamage}
        onClose={() => setActiveDamage(null)}
        type="damage"
        title={activeDamage?.title || ''}
        description={activeDamage?.description}
        category={activeDamage?.category}
        frameNumber={activeDamage?.frameNumber}
        images={activeDamage?.images?.sort((a, b) => a.orderIndex - b.orderIndex).map((img, i) => ({ url: img.imageUrl, order: i })) || []}
      />
    </div>
  );
}
