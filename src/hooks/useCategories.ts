import { useState, useEffect, useCallback } from 'react';
import { categoryService, Category } from '../services/category.service';

export function useCategories(enabled = true) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await categoryService.getCategories();
      setCategories(data);
    } catch (err: any) {
      console.error('useCategories error:', err);
      setError(err.message || 'Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) fetchCategories();
    else setLoading(false);
  }, [enabled, fetchCategories]);

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories
  };
}
