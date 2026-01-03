import { useState, useEffect } from 'react';
import { fetchPlanos, type PlanoData } from '../services/api';

export function usePlanos() {
    const [planos, setPlanos] = useState<PlanoData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
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
        };
        load();
    }, []);

    const refetch = async () => {
        try {
            setIsLoading(true);
            const data = await fetchPlanos();
            setPlanos(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar planos');
        } finally {
            setIsLoading(false);
        }
    };

    return { planos, isLoading, error, refetch };
}
