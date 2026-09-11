import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useVehicle360 } from '../hooks/useVehicle360';
import { vehicle360Service } from '../services/vehicle360.service';
import { ImageCoordinateStage } from './360/ImageCoordinateStage';
import { FrameUploader } from './360/FrameUploader';
import { MobileCaptureModal } from './360/MobileCaptureModal';
import { 
  Trash2, CheckCircle2, ChevronLeft, ChevronRight, Plus, AlertTriangle, AlertCircle, 
  X, Info, Edit2, Move, Focus, Eye, EyeOff, Save, Play, ArrowLeft, Loader2, Camera, MousePointer2, Maximize, Minimize, PanelRightClose, PanelRightOpen, Car as CarIcon, Smartphone
, UploadCloud } from 'lucide-react';
import { Car, Vehicle360Hotspot, Vehicle360DamageMarker, Vehicle360MarkerPosition } from '../types';
import { trackingProvider } from '../services/trackingProvider';
import {
  VEHICLE_PART_PRESETS,
  VEHICLE_PART_PRESET_GROUPS,
  VehiclePartPreset,
} from '../config/vehiclePartPresets';

interface Admin360ModuleProps {
  cars: Car[];
}

export function Admin360Module({ cars }: Admin360ModuleProps) {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [selectedViewType, setSelectedViewType] = useState<'exterior' | 'interior'>('exterior');
  
  if (cars.length === 0) {
    return <div className="p-8 text-center text-gray-500">Nenhum veículo cadastrado.</div>;
  }

  if (selectedVehicleId) {
    const car = cars.find(c => c.id === selectedVehicleId);
    return (
      <Vehicle360Workspace 
        key={`${selectedVehicleId}:${selectedViewType}`} 
        vehicleId={selectedVehicleId} 
        car={car!} 
        viewType={selectedViewType} 
        onViewTypeChange={setSelectedViewType}
        onBack={() => setSelectedVehicleId('')} 
      />
    );
  }

  return (
    <div className="mx-auto mt-4 max-w-5xl space-y-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-slate-950 px-6 py-8 text-white sm:px-10"><p className="text-xs font-bold uppercase tracking-[.18em] text-red-400">Estúdio de inspeção</p><h2 className="mt-2 text-3xl font-black">Configuração 360°</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Escolha o veículo e configure separadamente a visão externa ou interna, os pontos de interesse e as avarias.</p></div>
        
        <div className="mx-auto max-w-xl p-6 text-left sm:p-10">
          <label className="block text-sm font-medium text-gray-700 mb-2">Veículo</label>
          <select 
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4 font-semibold shadow-sm focus:border-red-500 focus:ring-red-500"
          >
            <option value="">-- Selecione um veículo --</option>
            {cars.map(car => (
              <option key={car.id} value={car.id}>{car.brand} {car.model} ({car.plateEnd})</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function Vehicle360Workspace({ vehicleId, car, viewType, onViewTypeChange, onBack }: { vehicleId: string, car: Car, viewType: 'exterior' | 'interior', onViewTypeChange: (v: 'exterior' | 'interior') => void, onBack: () => void }) {
  const { 
    project, loading, reload, currentFrame, setCurrentFrame, totalFrames,
    handlePointerDown, handlePointerMove, handlePointerUp,
    nextFrame, prevFrame, uploadFrames, removeFrame, uploading, uploadProgress,
    publishProject, unpublishProject, deleteProject, hotspots, damageMarkers,
    createHotspot, updateHotspot, deleteHotspot, 
    createDamageMarker, updateDamageMarker, deleteDamageMarker
  } = useVehicle360(vehicleId, 'admin', viewType);

  const [mode, setMode] = useState<'idle' | 'add_poi_pick' | 'add_damage_pick' | 'form' | 'tracking' | 'review' | 'manual_adjust' | 'checklist' | 'upload'>('idle');
  const [formType, setFormType] = useState<'poi' | 'damage'>('poi');
  const [draftPos, setDraftPos] = useState<{x: number, y: number, frame: number} | null>(null);
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);
  
  const [poiForm, setPoiForm] = useState({ title: '', description: '', file: null as File | null });
  const [damageForm, setDamageForm] = useState({ title: '', description: '', category: 'Outro', files: [] as File[] });
  const [selectedPartPreset, setSelectedPartPreset] = useState<VehiclePartPreset | null>(null);

  const [trackProgress, setTrackProgress] = useState('');
  const [trackedPositions, setTrackedPositions] = useState<Vehicle360MarkerPosition[]>([]);
  const [savingTracking, setSavingTracking] = useState(false);
  
  // Layout states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const workspaceRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && workspaceRef.current) {
      workspaceRef.current.requestFullscreen().catch(err => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showMobileModal, setShowMobileModal] = useState(false);

  const handleCreateProject = async () => {
    try {
      setIsCreating(true);
      setCreateError(null);
      await vehicle360Service.createProject(vehicleId, viewType);
      await reload();
    } catch (err: any) {
      setCreateError(err.message || "Erro ao criar projeto");
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[100dvh] bg-gray-50"><Loader2 className="animate-spin text-indigo-500 w-12 h-12" /></div>;
  }

  // Assuming error is returned by useVehicle360, but if not we can just show empty state
  // We'll just show the create button if no project
  if (!project) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 h-[100dvh]">
        <div className="min-h-16 bg-white border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6 shadow-sm shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100">
              <ArrowLeft size={20} /> Voltar aos veículos
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <CarIcon size={20} className="text-indigo-600" />
                {car.brand} {car.model}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
            <button onClick={() => onViewTypeChange('exterior')} className={`rounded-lg px-3 py-2 text-sm font-bold ${viewType === 'exterior' ? 'bg-white text-gray-950 shadow' : 'text-gray-500'}`}>Externo</button>
            <button onClick={() => onViewTypeChange('interior')} className={`rounded-lg px-3 py-2 text-sm font-bold ${viewType === 'interior' ? 'bg-white text-gray-950 shadow' : 'text-gray-500'}`}>Interno</button>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Nenhum projeto 360° {viewType === 'exterior' ? 'externo' : 'interno'}
          </h2>
          <p className="text-gray-500 mb-6">
            Este veículo ainda não possui uma visão 360° {viewType === 'exterior' ? 'externa' : 'interna'}.
          </p>
          {createError && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg max-w-md">
              {createError}
            </div>
          )}
          <button
            onClick={handleCreateProject}
            disabled={isCreating}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50"
          >
            {isCreating ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
            Criar projeto 360 {viewType === 'exterior' ? 'externo' : 'interno'}
          </button>
        </div>
      </div>
    );
  }

  const handleStageClick = (x: number, y: number) => {
    if (mode === 'add_poi_pick') {
      setDraftPos({ x, y, frame: currentFrame });
      setFormType('poi');
      setPoiForm({
        title: selectedPartPreset?.title || '',
        description: selectedPartPreset?.description || '',
        file: null,
      });
      setMode('form');
      setPanelOpen(true);
    } else if (mode === 'add_damage_pick') {
      setDraftPos({ x, y, frame: currentFrame });
      setFormType('damage');
      setDamageForm({ title: '', description: '', category: 'Outro', files: [] });
      setMode('form');
      setPanelOpen(true);
    } else if (mode === 'manual_adjust' && editingMarkerId) {
      setTrackedPositions(prev => {
        const filtered = prev.filter(p => p.frameNumber !== currentFrame);
        return [...filtered, {
          id: `new-${Date.now()}`,
          frameNumber: currentFrame,
          posX: x,
          posY: y,
          visible: true,
          isKeyframe: true
        }].sort((a, b) => a.frameNumber - b.frameNumber);
      });
    }
  };

  const beginGuidedPartTracking = (preset: VehiclePartPreset) => {
    setSelectedPartPreset(preset);
    setDraftPos(null);
    setFormType('poi');
    setPoiForm({ title: preset.title, description: preset.description, file: null });
    setMode('add_poi_pick');
    setPanelOpen(true);
  };

  const cancelMarkerCreation = () => {
    setSelectedPartPreset(null);
    setDraftPos(null);
    setMode('idle');
  };

  const startAutoTrack = async (markerId: string, initialFrame: number, initialX: number, initialY: number, type: 'poi' | 'damage') => {
    setMode('tracking');
    setTrackProgress('Iniciando...');
    setEditingMarkerId(markerId);
    setFormType(type);

    try {
      setTrackProgress('Rastreando com TAPIR...');

      const result = await trackingProvider.track({
        frames: project.frames?.map(f => f.imageUrl) || [],
        initialFrame,
        initialX,
        initialY,
        projectId: project.id,
        markerId,
        markerType: type
      });
      if (!result.positions?.length) throw new Error(result.error || 'O serviço não retornou posições para revisão.');
      setTrackedPositions(result.positions);
      setMode('review');
    } catch (err: any) {
      console.error(err);
      alert("Erro no rastreamento: " + err.message);
      setMode('idle');
    }
  };

  const saveFormAndTrack = async () => {
    if (!draftPos) return;
    try {
      setMode('tracking');
      setTrackProgress('Salvando informações...');
      
      let newMarkerId = '';
      if (formType === 'poi') {
        newMarkerId = await createHotspot({
          frameNumber: draftPos.frame,
          posX: draftPos.x,
          posY: draftPos.y,
          title: poiForm.title,
          description: poiForm.description,
          file: poiForm.file || undefined
        });
      } else {
        newMarkerId = await createDamageMarker({
          frameNumber: draftPos.frame,
          posX: draftPos.x,
          posY: draftPos.y,
          title: damageForm.title,
          description: damageForm.description,
          category: damageForm.category,
          files: damageForm.files
        });
      }
      
      await reload();
      await startAutoTrack(newMarkerId, draftPos.frame, draftPos.x, draftPos.y, formType);
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
      setMode('form');
    }
  };

  const saveTracking = async () => {
    if (!editingMarkerId) return;
    setSavingTracking(true);
    try {
      if (formType === 'poi') {
        await vehicle360Service.replaceHotspotPositions(editingMarkerId, trackedPositions);
      } else {
        await vehicle360Service.replaceDamagePositions(editingMarkerId, trackedPositions);
      }
      await reload();
      setMode('idle');
      setSelectedPartPreset(null);
      setDraftPos(null);
      setEditingMarkerId(null);
      setTrackedPositions([]);
    } catch (err: any) {
      alert("Erro ao salvar rastreamento: " + err.message);
    } finally {
      setSavingTracking(false);
    }
  };

  const editTracking = (id: string, type: 'poi' | 'damage', existingPositions: Vehicle360MarkerPosition[]) => {
    setEditingMarkerId(id);
    setFormType(type);
    setTrackedPositions(existingPositions || []);
    setMode('manual_adjust');
    setPanelOpen(true);
    
    const firstVis = existingPositions?.find(p => p.visible);
    if (firstVis) setCurrentFrame(firstVis.frameNumber);
  };

  const cancelTracking = () => {
    setMode('idle');
    setSelectedPartPreset(null);
    setDraftPos(null);
    setEditingMarkerId(null);
    setTrackedPositions([]);
  };

  const getStageMarkers = () => {
    if ((mode === 'manual_adjust' || mode === 'review') && trackedPositions.length > 0) {
      const pos = trackedPositions.find(p => p.frameNumber === currentFrame);
      if (pos && pos.visible) {
        return [{
          id: 'tracker',
          x: pos.posX,
          y: pos.posY,
          content: <div className="w-6 h-6 rounded-full border-2 border-white shadow-lg bg-indigo-500/80 animate-pulse flex items-center justify-center text-xs text-white font-bold">{pos.isKeyframe ? 'K' : ''}</div>
        }];
      }
      return [];
    }
    
    if ((mode === 'add_poi_pick' || mode === 'add_damage_pick' || mode === 'form') && draftPos && draftPos.frame === currentFrame) {
      return [{
        id: 'draft',
        x: draftPos.x,
        y: draftPos.y,
        content: <div className="w-6 h-6 rounded-full border-2 border-white shadow-lg bg-yellow-500 animate-pulse" />
      }];
    }

    if (mode === 'idle' || mode === 'checklist') {
       const hMarkers = hotspots.map(h => {
          const pos = h.positions?.find(p => p.frameNumber === currentFrame) || (h.frameNumber === currentFrame ? {posX: h.posX, posY: h.posY, visible: true} : null);
          if (!pos || !pos.visible) return null;
          return {
             id: h.id, x: pos.posX, y: pos.posY,
             content: <div className="w-6 h-6 rounded-full border-2 border-white shadow-md bg-blue-500 text-white flex items-center justify-center text-xs"><Info size={12}/></div>
          };
       }).filter(Boolean);

       const dMarkers = damageMarkers.map(d => {
          const pos = d.positions?.find(p => p.frameNumber === currentFrame) || (d.frameNumber === currentFrame ? {posX: d.posX, posY: d.posY, visible: true} : null);
          if (!pos || !pos.visible) return null;
          return {
             id: d.id, x: pos.posX, y: pos.posY,
             content: <div className="w-6 h-6 rounded-full border-2 border-white shadow-md bg-red-500 text-white flex items-center justify-center text-xs"><AlertTriangle size={12}/></div>
          };
       }).filter(Boolean);

       return [...hMarkers, ...dMarkers] as any[];
    }
    
    return [];
  };

  const currentFrameData = project.frames?.[currentFrame];
  const missingFrames = !project.frames || project.frames.length === 0;

  const renderRightPanel = () => {
    if (missingFrames) {
      return (
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Bem-vindo ao Estúdio 360°</h3>
          <p className="text-gray-600 mb-6">Para começar, faça o upload das imagens do giro 360 do veículo.</p>
          <button onClick={() => setShowMobileModal(true)} className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl mb-4 shadow-sm transition-colors">
            <Smartphone size={20} /> Capturar com celular
          </button>
          <FrameUploader viewType={viewType} currentFrameCount={0} onUpload={async (files, m) => { await uploadFrames(files, m); }} uploading={uploading} progress={uploadProgress} />
        </div>
      );
    }

    if (mode === 'add_poi_pick' || mode === 'add_damage_pick') {
      return (
        <div className="p-6 h-full flex flex-col justify-center items-center text-center bg-indigo-50/50">
          <MousePointer2 size={48} className="text-indigo-400 mb-4 animate-bounce" />
          <h3 className="text-xl font-bold text-indigo-900 mb-2">Posicione o marcador</h3>
          <p className="text-indigo-700 mb-3">
            {selectedPartPreset?.instruction || 'Clique na imagem ao lado sobre a peça ou avaria que deseja marcar.'}
          </p>
          {selectedPartPreset && (
            <span className="mb-8 rounded-full bg-white px-3 py-1 text-xs font-bold text-indigo-700 shadow-sm">
              O rastreio automático começará depois da confirmação
            </span>
          )}
          <button onClick={cancelMarkerCreation} className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancelar</button>
        </div>
      );
    }

    if (mode === 'form') {
      return (
        <div className="p-6 h-full flex flex-col overflow-y-auto">
           <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold text-gray-900">{formType === 'poi' ? 'Ponto de Interesse' : 'Avaria'}</h3>
             <button onClick={cancelMarkerCreation} className="text-gray-400 hover:text-gray-700"><X size={20}/></button>
           </div>
           
           <div className="space-y-4 flex-1">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
               <input type="text" className="w-full rounded-md border-gray-300" 
                 value={formType === 'poi' ? poiForm.title : damageForm.title}
                 onChange={e => formType === 'poi' ? setPoiForm({...poiForm, title: e.target.value}) : setDamageForm({...damageForm, title: e.target.value})}
               />
             </div>
             {formType === 'damage' && (
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                 <select className="w-full rounded-md border-gray-300" value={damageForm.category} onChange={e => setDamageForm({...damageForm, category: e.target.value})}>
                   <option>Risco</option><option>Amassado</option><option>Pintura</option><option>Outro</option>
                 </select>
               </div>
             )}
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
               <textarea className="w-full rounded-md border-gray-300 h-24" 
                 value={formType === 'poi' ? poiForm.description : damageForm.description}
                 onChange={e => formType === 'poi' ? setPoiForm({...poiForm, description: e.target.value}) : setDamageForm({...damageForm, description: e.target.value})}
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Fotos da peça</label>
               <input type="file" multiple={formType === 'damage'} accept="image/*" className="text-sm w-full" 
                 onChange={e => {
                   if (formType === 'poi') setPoiForm({...poiForm, file: e.target.files?.[0] || null});
                   else setDamageForm({...damageForm, files: Array.from(e.target.files || [])});
                 }}
               />
             </div>
           </div>
           
           <div className="pt-4 border-t mt-4 space-y-2">
             <button onClick={saveFormAndTrack} className="w-full py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 shadow-sm flex items-center justify-center gap-2">
               Confirmar e Rastrear
             </button>
             <button onClick={cancelMarkerCreation} className="w-full py-3 text-gray-600 font-medium rounded-xl hover:bg-gray-100">
               Cancelar
             </button>
           </div>
        </div>
      );
    }

    if (mode === 'tracking') {
      return (
        <div className="p-6 h-full flex flex-col justify-center items-center text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-6" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Processando...</h3>
          <p className="text-gray-600 font-medium">{trackProgress}</p>
          <button onClick={cancelTracking} className="mt-8 px-6 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium">Interromper</button>
        </div>
      );
    }

    if (mode === 'review' || mode === 'manual_adjust') {
      const lowConfidenceFrames = trackedPositions.filter(p => !p.visible || (p.confidence !== undefined && p.confidence < 0.7 && p.confidence > 0));
      const hasIssues = lowConfidenceFrames.length > 0;
      
      const currentPos = trackedPositions.find(p => p.frameNumber === currentFrame);

      return (
        <div className="p-6 h-full flex flex-col">
           <div className="mb-6">
             <h3 className="text-lg font-bold text-gray-900 mb-1">Ajuste de Rastreamento</h3>
             <p className="text-sm text-gray-500">Analise o caminho detectado. Você pode corrigir frames incorretos clicando na imagem.</p>
           </div>
           
           {hasIssues && mode === 'review' && (
             <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-6">
               <h4 className="font-semibold text-amber-900 flex items-center gap-2 mb-2"><AlertTriangle size={16}/> Revisão sugerida</h4>
               <p className="text-sm text-amber-800 mb-3">Alguns frames tiveram baixa confiança na detecção automática.</p>
               <div className="flex flex-wrap gap-1">
                 {lowConfidenceFrames.map(p => (
                   <button key={p.frameNumber} onClick={() => setCurrentFrame(p.frameNumber)} className="w-8 h-8 rounded bg-amber-200 text-amber-900 text-xs font-bold hover:bg-amber-300">
                     {p.frameNumber + 1}
                   </button>
                 ))}
               </div>
             </div>
           )}

           <div className="flex-1 overflow-y-auto space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="font-medium text-gray-900 mb-2">Controles do Frame {currentFrame + 1}</div>
                {currentPos ? (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setTrackedPositions(prev => {
                          const existing = prev.find(p => p.frameNumber === currentFrame);
                          const filtered = prev.filter(p => p.frameNumber !== currentFrame);
                          return [...filtered, {
                            id: existing ? existing.id : `new-${Date.now()}`,
                            frameNumber: currentFrame,
                            posX: existing ? existing.posX : 50,
                            posY: existing ? existing.posY : 50,
                            visible: existing ? !existing.visible : false,
                            isKeyframe: true
                          }].sort((a, b) => a.frameNumber - b.frameNumber);
                        });
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg"
                    >
                      {currentPos.visible ? <EyeOff size={16} /> : <Eye size={16} />} {currentPos.visible ? 'Ocultar peça' : 'Mostrar peça'}
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Clique na imagem para definir a posição neste frame.</div>
                )}
                <div className="mt-4 text-xs text-gray-500">
                  <span className="font-semibold">Dica:</span> Para corrigir, selecione o frame no rolo de filme abaixo e clique na nova posição correta sobre a imagem. Isso criará um Quadro-Chave manual.
                </div>
              </div>
           </div>
           
           <div className="pt-4 border-t mt-4 space-y-2">
             <button onClick={saveTracking} disabled={savingTracking} className="w-full py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 shadow-sm flex items-center justify-center gap-2 disabled:opacity-50">
               <Save size={18} /> {savingTracking ? 'Salvando...' : 'Salvar Rastreamento'}
             </button>
             <button onClick={cancelTracking} className="w-full py-3 text-gray-600 font-medium rounded-xl hover:bg-gray-100">
               Descartar Ajustes
             </button>
           </div>
        </div>
      );
    }
    
    if (mode === 'upload') {
      return (
        <div className="p-6 h-full flex flex-col overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold text-gray-900">Upload de Imagens</h3>
             <button onClick={() => setMode('idle')} className="text-gray-400 hover:text-gray-700"><X size={20}/></button>
          </div>
          <FrameUploader viewType={viewType} currentFrameCount={totalFrames} onUpload={async (files, m) => { await uploadFrames(files, m); setMode('idle'); }} uploading={uploading} progress={uploadProgress} />
        </div>
      );
    }
    
    if (mode === 'checklist') {
       const isComplete = project.status === 'completed';
       return (
         <div className="p-6 h-full flex flex-col">
           <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold text-gray-900">Publicação</h3>
             <button onClick={() => setMode('idle')} className="text-gray-400 hover:text-gray-700"><X size={20}/></button>
           </div>
           
           <div className="flex-1">
             <div className="space-y-3 mb-8">
               <div className="flex items-center gap-3 text-gray-700">
                 <CheckCircle2 className="text-green-500" size={20} />
                 <span>Imagens 360° carregadas ({totalFrames} frames)</span>
               </div>
               <div className="flex items-center gap-3 text-gray-700">
                 <CheckCircle2 className="text-green-500" size={20} />
                 <span>{hotspots.length} pontos de interesse</span>
               </div>
               <div className="flex items-center gap-3 text-gray-700">
                 <CheckCircle2 className="text-green-500" size={20} />
                 <span>{damageMarkers.length} avarias registradas</span>
               </div>
             </div>
             
             {isComplete ? (
               <div className="bg-green-50 text-green-800 p-4 rounded-xl border border-green-200 text-center mb-6">
                 <CheckCircle2 size={32} className="mx-auto mb-2 text-green-600" />
                 <div className="font-bold">Visualização Publicada</div>
                 <div className="text-sm mt-1">Disponível para clientes.</div>
               </div>
             ) : (
               <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 text-center mb-6">
                 <AlertTriangle size={32} className="mx-auto mb-2 text-amber-600" />
                 <div className="font-bold">Rascunho Oculto</div>
                 <div className="text-sm mt-1">Clientes não podem ver ainda.</div>
               </div>
             )}
           </div>
           
           <div className="space-y-2">
              <button 
                onClick={isComplete ? unpublishProject : publishProject} 
                className={`w-full py-3 font-bold rounded-xl shadow-sm transition-colors ${isComplete ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-green-600 text-white hover:bg-green-700'}`}
              >
                {isComplete ? 'Despublicar e Ocultar' : 'Publicar 360°'}
              </button>
              <button
                onClick={async () => {
                  if (!window.confirm(`Excluir definitivamente o projeto 360° ${viewType === 'exterior' ? 'externo' : 'interno'}? Imagens e marcadores serão removidos.`)) return;
                  await deleteProject();
                  onBack();
                }}
                className="w-full rounded-xl border border-red-200 bg-red-50 py-3 font-bold text-red-700 transition hover:bg-red-100"
              >
                Excluir projeto {viewType === 'exterior' ? 'externo' : 'interno'}
              </button>
           </div>
         </div>
       );
    }

    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 space-y-2 bg-gray-50/50">
          <button onClick={() => { setSelectedPartPreset(null); setMode('add_poi_pick'); setPanelOpen(false); }} className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-transform active:scale-95">
            <Plus size={18} /> Adicionar Ponto de Interesse
          </button>
          <button onClick={() => { setSelectedPartPreset(null); setMode('add_damage_pick'); setPanelOpen(false); }} className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 shadow-sm transition-transform active:scale-95">
            <Plus size={18} /> Adicionar Avaria
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <section className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
            <div className="mb-1 flex items-center gap-2 text-sm font-bold text-indigo-950">
              <Focus size={16} className="text-indigo-600" /> Rastreios rápidos
            </div>
            <p className="mb-3 text-xs leading-relaxed text-indigo-700">
              Escolha a peça, abra um frame em que ela esteja visível e marque apenas uma vez.
            </p>
            <div className="space-y-3">
              {VEHICLE_PART_PRESET_GROUPS.map((group) => (
                <div key={group}>
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-500">{group}</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {VEHICLE_PART_PRESETS.filter((preset) => preset.group === group).map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => beginGuidedPartTracking(preset)}
                        title={preset.instruction}
                        className="min-h-10 rounded-lg border border-indigo-100 bg-white px-2 py-2 text-left text-[11px] font-semibold leading-tight text-gray-700 transition-colors hover:border-indigo-300 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {preset.title}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wider mb-2">Marcadores Ativos</h4>
          
          {hotspots.length === 0 && damageMarkers.length === 0 && (
            <div className="text-center p-6 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500 text-sm">
              Nenhum marcador criado.<br/>Use os botões acima para começar.
            </div>
          )}

          {hotspots.map(h => (
            <div key={h.id} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <Info size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="font-semibold text-gray-900 truncate">{h.title}</h5>
                  <div className="text-xs text-gray-500 truncate mb-2">{h.description}</div>
                  
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setCurrentFrame(h.positions?.[0]?.frameNumber || 0)} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 font-medium flex items-center gap-1"><Focus size={12}/> Localizar</button>
                    <button onClick={() => editTracking(h.id, 'poi', h.positions || [])} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-100 font-medium flex items-center gap-1"><Move size={12}/> Rastreamento</button>
                    <button onClick={() => { if(window.confirm('Excluir?')) deleteHotspot(h); }} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 ml-auto"><Trash2 size={12}/></button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {damageMarkers.map(d => (
            <div key={d.id} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="font-semibold text-gray-900 truncate">{d.title}</h5>
                  <div className="text-xs text-red-500 font-medium mb-2">{d.category}</div>
                  
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setCurrentFrame(d.positions?.[0]?.frameNumber || 0)} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 font-medium flex items-center gap-1"><Focus size={12}/> Localizar</button>
                    <button onClick={() => editTracking(d.id, 'damage', d.positions || [])} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-100 font-medium flex items-center gap-1"><Move size={12}/> Rastreamento</button>
                    <button onClick={() => { if(window.confirm('Excluir?')) deleteDamageMarker(d); }} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 ml-auto"><Trash2 size={12}/></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t border-gray-200 bg-white shrink-0 space-y-2">
          <button onClick={() => {
            if (totalFrames <= 1) {
              alert("Não é possível excluir o último frame.");
              return;
            }
            if (window.confirm(`Excluir o frame ${currentFrame + 1}? Os frames seguintes e os rastreamentos serão renumerados. Esta ação não poderá ser desfeita.`)) {
              if (currentFrameData) removeFrame(currentFrameData);
            }
          }} className="w-full flex items-center justify-center gap-2 py-2 bg-red-50 text-red-600 font-medium rounded-xl hover:bg-red-100 shadow-sm transition-colors text-sm">
             <Trash2 size={16} /> Excluir frame atual
          </button>
          
          <button onClick={() => setMode('upload')} className="w-full flex items-center justify-center gap-2 py-2 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 shadow-sm transition-colors text-sm">
             <UploadCloud size={16} /> Adicionar/Substituir Imagens
          </button>
          
          <button onClick={() => setShowMobileModal(true)} className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-50 text-indigo-700 font-medium rounded-xl hover:bg-indigo-100 shadow-sm transition-colors text-sm">
             <Smartphone size={16} /> Capturar com celular
          </button>

          <button onClick={() => setMode('checklist')} className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 shadow-sm transition-transform active:scale-95 mt-2">
             <CheckCircle2 size={18} /> Resumo e Publicação
          </button>
        </div>
      </div>
    );
  };

  return (
    <div ref={workspaceRef} className="fixed inset-0 z-50 flex flex-col bg-gray-950 h-[100dvh]">
      {!isFullscreen && (
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 shadow-sm shrink-0 overflow-x-auto">
          <div className="flex items-center gap-4 shrink-0">
            <button onClick={onBack} className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100">
              <ArrowLeft size={20} /> Voltar aos veículos
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <CarIcon size={20} className="text-indigo-600" />
                {car.brand} {car.model}
              </h1>
              <div className="text-xs font-medium text-gray-500">Editando visão {viewType === 'exterior' ? 'externa' : 'interna'} • {car.plateEnd} • {totalFrames} frames</div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-gray-100 p-1 rounded-lg shrink-0 mx-4">
            <button
              onClick={() => onViewTypeChange('exterior')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewType === 'exterior' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              360° Externo
            </button>
            <button
              onClick={() => onViewTypeChange('interior')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewType === 'interior' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              360° Interno
            </button>
          </div>
          <div className="flex items-center gap-3 shrink-0">
             <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${project.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
               {project.status === 'completed' ? 'Publicado' : 'Rascunho'}
             </div>
          </div>
        </div>
      )}
      
      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative">
         <div className="flex-1 flex flex-col min-w-0 bg-gray-950 relative">
            <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
              <button 
                onClick={() => setPanelOpen(!panelOpen)}
                className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg backdrop-blur shadow-sm transition-colors"
                title={panelOpen ? "Ocultar painel" : "Mostrar painel"}
              >
                {panelOpen ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
              </button>
              <button 
                onClick={toggleFullscreen}
                className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg backdrop-blur shadow-sm transition-colors"
                title={isFullscreen ? "Sair da tela cheia (Esc)" : "Tela cheia"}
              >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
            
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
               {currentFrameData && (
                 <div className="w-full h-full">
                   <ImageCoordinateStage
                     imageUrl={currentFrameData.imageUrl}
                     markers={getStageMarkers()}
                     className={mode === 'add_poi_pick' || mode === 'add_damage_pick' || mode === 'manual_adjust' ? "cursor-crosshair" : "cursor-ew-resize"}
                     onPointerDown={handlePointerDown}
                     onPointerMove={handlePointerMove}
                     onPointerUp={handlePointerUp}
                     onPointerCancel={handlePointerUp}
                     onPointerLeave={handlePointerUp}
                     onCoordinateClick={({x, y}) => handleStageClick(x, y)}
                   />
                 </div>
               )}
               
               {(mode === 'add_poi_pick' || mode === 'add_damage_pick') && (
                 <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur text-indigo-900 px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-3 animate-pulse border border-indigo-100 z-20">
                    <MousePointer2 size={20} /> {selectedPartPreset ? `Marque: ${selectedPartPreset.title}` : 'Clique na peça ou avaria'}
                 </div>
               )}
            </div>
            
            {!missingFrames && (
              <div className="h-[72px] sm:h-24 bg-gray-950 border-t border-gray-800 overflow-x-auto flex items-center px-4 gap-2 shrink-0 scrollbar-thin scrollbar-thumb-gray-700">
                 {project.frames?.map((f, idx) => {
                   let frameClasses = "border-transparent";
                   let indicator = null;
                   
                   if (mode === 'review' || mode === 'manual_adjust') {
                     const pos = trackedPositions.find(p => p.frameNumber === idx);
                     if (pos) {
                       if (!pos.visible) {
                          frameClasses = "border-gray-500 opacity-50";
                       } else if (pos.isKeyframe) {
                          frameClasses = "border-indigo-500";
                          indicator = <div className="absolute bottom-1 right-1 w-2 h-2 bg-indigo-500 rounded-full shadow" />;
                       } else if (pos.confidence !== undefined && pos.confidence < 0.7) {
                          frameClasses = "border-amber-500";
                          indicator = <div className="absolute bottom-1 right-1 w-2 h-2 bg-amber-500 rounded-full shadow" />;
                       } else {
                          frameClasses = "border-green-500";
                       }
                     }
                   }
                   
                   return (
                     <div 
                       key={f.id}
                       className={`relative group h-12 sm:h-16 aspect-video shrink-0 rounded-md overflow-hidden border-2 transition-all ${idx === currentFrame ? 'ring-2 ring-white scale-105 z-10' : 'hover:border-gray-500'} ${frameClasses}`}
                     >
                       <button onClick={() => setCurrentFrame(idx)} className="w-full h-full focus:outline-none">
                         <img src={f.imageUrl} alt="" className="w-full h-full object-cover" />
                       </button>
                       <div className="absolute top-0 left-0 bg-black/60 text-white text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-br font-mono pointer-events-none">{idx + 1}</div>
                       {indicator}
                       
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           if (project.frames && project.frames.length <= 1) {
                             alert("Não é possível excluir o último frame.");
                             return;
                           }
                           if (window.confirm(`Excluir o frame ${idx + 1}? Os rastreamentos serão renumerados. Ação irreversível.`)) {
                             removeFrame(f);
                           }
                         }}
                         className="absolute top-1 right-1 w-5 h-5 bg-red-600/90 hover:bg-red-700 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 focus:opacity-100"
                         title="Excluir frame"
                       >
                         <Trash2 size={10} />
                       </button>
                     </div>
                   );
                 })}
              </div>
            )}
         </div>
         
         {/* Right Panel */}
         <div 
            className={`absolute md:static top-0 right-0 h-full w-[300px] sm:w-[360px] bg-white border-l border-gray-200 flex flex-col shadow-2xl z-40 transition-transform duration-300 ${panelOpen ? 'translate-x-0' : 'translate-x-full md:hidden'}`}
            style={{ display: panelOpen ? 'flex' : 'none' }}
         >
             {renderRightPanel()}
         </div>
      </div>
      
      {showMobileModal && (
        <MobileCaptureModal 
          isOpen={showMobileModal}
          onClose={() => setShowMobileModal(false)}
          projectId={project.id}
          vehicleId={vehicleId}
          viewType={viewType}
          existingFramesCount={totalFrames}
        />
      )}
    </div>
  );
}
