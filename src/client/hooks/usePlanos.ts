import { useState, useEffect, useCallback } from 'react';
import { fetchPlanos, type PlanoData } from '../services/api';

export function usePlanos() {
    const [planos, setPlanos] = useState<PlanoData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Una sola función reutilizable para fetch
    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await fetchPlanos();
            setPlanos(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar planos');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Cargar datos al montar
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { planos, isLoading, error, refetch: fetchData };
}

