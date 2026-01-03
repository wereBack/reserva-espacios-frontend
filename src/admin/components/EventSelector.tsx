import { useState, useEffect } from 'react';
import { fetchEventos, createEvento, fetchPlanosByEvento, type EventoData, type PlanoData } from '../services/api';
import { useStandStore } from '../store/standStore';

const EventSelector = () => {
    const { eventoId, setEventoId, loadPlano, clearAll, planoId } = useStandStore();
    const [eventos, setEventos] = useState<EventoData[]>([]);
    const [planos, setPlanos] = useState<PlanoData[]>([]);
    const [isLoadingPlanos, setIsLoadingPlanos] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newEventData, setNewEventData] = useState({
        nombre: '',
        fecha_reserva_desde: '',
        fecha_reserva_hasta: ''
    });

    useEffect(() => {
        loadEventos();
    }, []);

    // Load planos when event changes
    useEffect(() => {
        if (eventoId) {
            loadPlanosForEvent(eventoId);
        } else {
            setPlanos([]);
        }
    }, [eventoId]);

    const loadEventos = async () => {
        try {
            const data = await fetchEventos();
            setEventos(data);
        } catch (error) {
            console.error('Error cargando eventos', error);
        }
    };

    const loadPlanosForEvent = async (eventId: string) => {
        setIsLoadingPlanos(true);
        try {
            const data = await fetchPlanosByEvento(eventId);
            setPlanos(data);
        } catch (error) {
            console.error('Error cargando planos', error);
            setPlanos([]);
        } finally {
            setIsLoadingPlanos(false);
        }
    };

    const handleEventChange = (newEventoId: string | null) => {
        setEventoId(newEventoId);
        // Clear current plano when changing event
        clearAll();
    };

    const handleLoadPlano = async (planoIdToLoad: string) => {
        await loadPlano(planoIdToLoad);
    };

    const handleNewPlano = () => {
        clearAll();
        // Keep the event selected
        if (eventoId) {
            setEventoId(eventoId);
        }
    };

    const handleCreateEvento = async () => {
        if (!newEventData.nombre || !newEventData.fecha_reserva_desde || !newEventData.fecha_reserva_hasta) {
            alert('Completa todos los campos');
            return;
        }
        try {
            const newEvent = await createEvento({
                nombre: newEventData.nombre,
                fecha_reserva_desde: new Date(newEventData.fecha_reserva_desde).toISOString(),
                fecha_reserva_hasta: new Date(newEventData.fecha_reserva_hasta).toISOString(),
            });
            setEventos([...eventos, newEvent]);
            setEventoId(newEvent.id);
            setIsCreating(false);
            setNewEventData({ nombre: '', fecha_reserva_desde: '', fecha_reserva_hasta: '' });
        } catch (error) {
            alert('Error al crear evento');
        }
    };

    return (
        <div className="toolbar__section event-selector">
            <h3 className="toolbar__section-title">Evento</h3>

            {!isCreating ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <select
                        className="toolbar__input"
                        value={eventoId || ''}
                        onChange={(e) => handleEventChange(e.target.value || null)}
                    >
                        <option value="">-- Sin evento --</option>
                        {eventos.map(e => (
                            <option key={e.id} value={e.id}>{e.nombre}</option>
                        ))}
                    </select>
                    <button
                        className="toolbar__button"
                        onClick={() => setIsCreating(true)}
                    >
                        + Nuevo Evento
                    </button>
                </div>
            ) : (
                <div className="event-creator" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                        type="text"
                        placeholder="Nombre evento"
                        className="toolbar__input"
                        value={newEventData.nombre}
                        onChange={e => setNewEventData({ ...newEventData, nombre: e.target.value })}
                    />
                    <label style={{ fontSize: '0.8rem', color: '#666' }}>Reserva Desde</label>
                    <input
                        type="datetime-local"
                        className="toolbar__input"
                        value={newEventData.fecha_reserva_desde}
                        onChange={e => setNewEventData({ ...newEventData, fecha_reserva_desde: e.target.value })}
                    />
                    <label style={{ fontSize: '0.8rem', color: '#666' }}>Reserva Hasta</label>
                    <input
                        type="datetime-local"
                        className="toolbar__input"
                        value={newEventData.fecha_reserva_hasta}
                        onChange={e => setNewEventData({ ...newEventData, fecha_reserva_hasta: e.target.value })}
                    />
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="toolbar__button toolbar__button--active" onClick={handleCreateEvento}>Crear</button>
                        <button className="toolbar__button" onClick={() => setIsCreating(false)}>Cancelar</button>
                    </div>
                </div>
            )}

            {/* Planos section - only show when event is selected */}
            {eventoId && !isCreating && (
                <div style={{ marginTop: '16px' }}>
                    <h4 className="toolbar__section-title">Planos del evento</h4>

                    {isLoadingPlanos ? (
                        <p style={{ fontSize: '0.85rem', color: '#888' }}>Cargando planos...</p>
                    ) : planos.length === 0 ? (
                        <p style={{ fontSize: '0.85rem', color: '#888' }}>No hay planos guardados</p>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {planos.map(p => (
                                <li key={p.id}>
                                    <button
                                        className={`toolbar__button ${planoId === p.id ? 'toolbar__button--active' : ''}`}
                                        onClick={() => handleLoadPlano(p.id!)}
                                        style={{ width: '100%', textAlign: 'left' }}
                                    >
                                        📄 {p.name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    <button
                        className="toolbar__button toolbar__button--ghost"
                        onClick={handleNewPlano}
                        style={{ marginTop: '8px' }}
                    >
                        + Nuevo Plano
                    </button>
                </div>
            )}
        </div>
    );
};

export default EventSelector;

