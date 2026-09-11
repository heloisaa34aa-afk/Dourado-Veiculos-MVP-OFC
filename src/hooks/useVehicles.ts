import { useState, useEffect, useCallback } from 'react';
import { vehicleService } from '../services/vehicle.service';
import { Car } from '../types';

const VEHICLE_CACHE_KEY = 'dourado:public-vehicles:v1';

function readCachedVehicles(): Car[] {
  try {
    const cached = localStorage.getItem(VEHICLE_CACHE_KEY);
    if (!cached) return [];
    const parsed = JSON.parse(cached);
    return Array.isArray(parsed?.data) ? parsed.data : [];
  } catch {
    return [];
  }
}

function cacheVehicles(data: Car[]) {
  try {
    localStorage.setItem(VEHICLE_CACHE_KEY, JSON.stringify({ data, savedAt: Date.now() }));
  } catch {
    // Storage can be unavailable in private/restricted browser contexts.
  }
}

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Car[]>(readCachedVehicles);
  const [loading, setLoading] = useState<boolean>(() => readCachedVehicles().length === 0);
  const [error, setError] = useState<string | null>(null);

  const fetchVehicles = useCallback(async () => {
    try {
      setError(null);
      const data = await vehicleService.getVehicles();
      setVehicles(data);
      cacheVehicles(data);
    } catch (err: any) {
      console.error('useVehicles error:', err);
      setError(err.message || 'Erro ao carregar veículos do Supabase.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const addVehicle = async (car: Omit<Car, 'id'>) => {
    try {
      const newCar = await vehicleService.createVehicle(car);
      setVehicles(prev => {
        const next = [newCar, ...prev];
        cacheVehicles(next);
        return next;
      });
      return newCar;
    } catch (err: any) {
      console.error('Failed to add vehicle:', err);
      throw err;
    }
  };

  const updateVehicle = async (id: string, car: Partial<Car>) => {
    try {
      const updated = await vehicleService.updateVehicle(id, car);
      setVehicles(prev => {
        const next = prev.map(c => c.id === id ? updated : c);
        cacheVehicles(next);
        return next;
      });
      return updated;
    } catch (err: any) {
      console.error('Failed to update vehicle:', err);
      throw err;
    }
  };

  const deleteVehicle = async (id: string) => {
    try {
      await vehicleService.deleteVehicle(id);
      setVehicles(prev => {
        const next = prev.filter(c => c.id !== id);
        cacheVehicles(next);
        return next;
      });
    } catch (err: any) {
      console.error('Failed to delete vehicle:', err);
      throw err;
    }
  };

  return {
    vehicles,
    loading,
    error,
    refresh: fetchVehicles,
    addVehicle,
    updateVehicle,
    deleteVehicle
  };
}
