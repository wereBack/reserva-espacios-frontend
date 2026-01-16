import { useState } from 'react'
import { useStandStore, type Stand, type ReservationState } from '../store/standStore'
import { updateSpace as apiUpdateSpace, deleteSpace as apiDeleteSpace, createSpace as apiCreateSpace } from '../services/api'

const STATUS_OPTIONS: { value: ReservationState; label: string; color: string }[] = [
    { value: 'AVAILABLE', label: 'Disponible', color: '#22c55e' },
    { value: 'PENDING', label: 'Pendiente', color: '#fbbf24' },
    { value: 'RESERVED', label: 'Reservado', color: '#ef4444' },
    { value: 'BLOCKED', label: 'Bloqueado', color: '#9ca3af' },
]

// Simple toast notification
const showToast = (message: string) => {
    const toast = document.createElement('div')
    toast.className = 'toast-notification toast-notification--success'
    toast.textContent = message
    document.body.appendChild(toast)

    setTimeout(() => {
        toast.classList.add('toast-notification--fade-out')
        setTimeout(() => toast.remove(), 300)
    }, 2500)
}

const StandList = () => {
    const stands = useStandStore((state) => state.stands)
    const selectedStandId = useStandStore((state) => state.selectedStandId)
    const planoId = useStandStore((state) => state.planoId)
    const selectStand = useStandStore((state) => state.selectStand)
    const updateStand = useStandStore((state) => state.updateStand)
    const removeStand = useStandStore((state) => state.removeStand)
    const replaceStandId = useStandStore((state) => state.replaceStandId)
    const isNameDuplicate = useStandStore((state) => state.isNameDuplicate)

    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [editValues, setEditValues] = useState<{ name: string; price: string; status: ReservationState }>({ name: '', price: '', status: 'AVAILABLE' })
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState<string | null>(null)

    // Get stand type label
    const getTypeLabel = (kind: string) => {
        switch (kind) {
            case 'rect':
                return 'RECT'
            case 'polygon':
                return 'POLY'
            case 'free':
                return 'FREE'
            default:
                return kind.toUpperCase()
        }
    }

    // Get dimensions for rect shapes
    const getDimensions = (stand: Stand) => {
        return `${Math.round(stand.width)}×${Math.round(stand.height)} px`
    }

    // Get status color dot
    const getStatusColor = (stand: Stand) => {
        switch (stand.reservationStatus) {
            case 'PENDING':
                return '#fbbf24'
            case 'RESERVED':
                return '#ef4444'
            case 'BLOCKED':
                return '#9ca3af'
            default:
                return '#22c55e'
        }
    }

    // Toggle expand/collapse
    const handleToggle = (stand: Stand) => {
        if (expandedId === stand.id) {
            setExpandedId(null)
        } else {
            setExpandedId(stand.id)
            setEditValues({
                name: stand.label || '',
                price: stand.price?.toString() || '0.00',
                status: stand.reservationStatus || 'AVAILABLE',
            })
        }
        selectStand(stand.id)
    }

    // Save changes
    const handleSave = async (stand: Stand) => {
        // Check for duplicate name
        if (editValues.name && isNameDuplicate(editValues.name, stand.id)) {
            alert(`¡El nombre "${editValues.name}" ya está en uso por otro stand!`)
            return
        }

        // Determinar si hay que resetear el nombre (cuando cambia a AVAILABLE o BLOCKED)
        let finalName = editValues.name
        const wasReservedOrPending = stand.reservationStatus === 'RESERVED' || stand.reservationStatus === 'PENDING'
        const isNowAvailableOrBlocked = editValues.status === 'AVAILABLE' || editValues.status === 'BLOCKED'

        if (wasReservedOrPending && isNowAvailableOrBlocked) {
            // Calcular nombre genérico basado en la posición en la lista
            const standIndex = stands.findIndex(s => s.id === stand.id)
            finalName = `Stand ${standIndex + 1}`
        }

        const updates = {
            label: finalName,
            price: parseFloat(editValues.price) || 0,
            reservationStatus: editValues.status,
        }
        updateStand(stand.id, updates)

        // Actualizar el valor en el form también
        setEditValues(prev => ({ ...prev, name: finalName }))

        // Check if UUID (saved in DB)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stand.id)
        setIsSaving(true)

        try {
            if (isUUID) {
                // Update existing stand with all data
                await apiUpdateSpace(stand.id, {
                    name: finalName,
                    price: parseFloat(editValues.price) || null,
                    status: editValues.status,
                    x: stand.x,
                    y: stand.y,
                    width: stand.width,
                    height: stand.height,
                    color: stand.color,
                    zone_id: stand.zone_id || null,
                })
                showToast(`✅ Stand "${finalName}" guardado correctamente`)
            } else {
                // Create new stand
                if (!planoId) {
                    alert('Primero debes guardar el área antes de guardar stands individuales')
                    setIsSaving(false)
                    return
                }

                // Build create data for rect stand
                const createData: Parameters<typeof apiCreateSpace>[0] = {
                    plano_id: planoId,
                    kind: 'rect',
                    x: stand.x,
                    y: stand.y,
                    width: stand.width,
                    height: stand.height,
                    color: stand.color,
                    name: editValues.name || 'Nuevo Stand',
                    price: parseFloat(editValues.price) || null,
                    zone_id: stand.zone_id,
                }

                const created = await apiCreateSpace(createData)
                // Replace local ID with backend UUID
                if (created.id) {
                    replaceStandId(stand.id, created.id)
                    setExpandedId(created.id)
                }
                showToast(`✅ Stand "${editValues.name || 'Nuevo Stand'}" creado correctamente`)
            }
        } catch (e) {
            console.error('Error saving stand:', e)
            alert('Error al guardar el stand')
        } finally {
            setIsSaving(false)
        }
    }

    // Delete stand
    const handleDelete = async (standId: string) => {
        if (!confirm('¿Eliminar este stand?')) return

        // Check if UUID (saved in DB)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(standId)

        if (isUUID) {
            setIsDeleting(standId)
            try {
                await apiDeleteSpace(standId)
            } catch (e) {
                console.error('Error deleting stand:', e)
                alert('Error al eliminar el stand')
                setIsDeleting(null)
                return
            }
            setIsDeleting(null)
        }

        // Remove from local store
        removeStand(standId)
        if (expandedId === standId) {
            setExpandedId(null)
        }
    }

    if (stands.length === 0) {
        return (
            <div className="stand-list-panel stand-list-panel--empty">
                <p>No hay stands creados</p>
            </div>
        )
    }

    return (
        <div className="stand-list-panel">
            <div className="stand-list-header">
                <h3>📍 Stands</h3>
                <span className="stand-list-count">{stands.length}</span>
            </div>

            <ul className="stand-list">
                {stands.map((stand) => {
                    const isExpanded = expandedId === stand.id
                    const isSelected = selectedStandId === stand.id

                    return (
                        <li
                            key={stand.id}
                            className={`stand-list-item ${isSelected ? 'stand-list-item--selected' : ''} ${isExpanded ? 'stand-list-item--expanded' : ''}`}
                        >
                            <button
                                className="stand-list-item__header"
                                onClick={() => handleToggle(stand)}
                            >
                                <span
                                    className="stand-list-item__dot"
                                    style={{ backgroundColor: getStatusColor(stand) }}
                                />
                                <span className="stand-list-item__name">
                                    {stand.label || `Stand ${stand.id.slice(0, 6)}`}
                                </span>
                                {stand.price && (
                                    <span className="stand-list-item__price">
                                        ${stand.price}
                                    </span>
                                )}
                                <span className="stand-list-item__type">
                                    {getTypeLabel(stand.kind)}
                                </span>
                                <span className={`stand-list-item__arrow ${isExpanded ? 'stand-list-item__arrow--up' : ''}`}>
                                    ▼
                                </span>
                            </button>

                            {isExpanded && (
                                <div className="stand-list-item__body">
                                    <div className="stand-list-item__field">
                                        <label>NOMBRE</label>
                                        <input
                                            type="text"
                                            value={editValues.name}
                                            onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                                            placeholder="Nombre del stand"
                                        />
                                    </div>

                                    <div className="stand-list-item__row">
                                        <div className="stand-list-item__field stand-list-item__field--half">
                                            <label>PRECIO (US$)</label>
                                            <input
                                                type="number"
                                                value={editValues.price}
                                                onChange={(e) => setEditValues({ ...editValues, price: e.target.value })}
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>

                                        <div className="stand-list-item__field stand-list-item__field--half">
                                            <label>ESTADO</label>
                                            <select
                                                value={editValues.status}
                                                onChange={(e) => setEditValues({ ...editValues, status: e.target.value as ReservationState })}
                                                className="stand-list-item__select"
                                            >
                                                {STATUS_OPTIONS.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="stand-list-item__dimensions">
                                        Tamaño: {getDimensions(stand)}
                                    </div>

                                    <div className="stand-list-item__actions">
                                        <button
                                            className="stand-list-item__btn stand-list-item__btn--save"
                                            onClick={() => handleSave(stand)}
                                            disabled={isSaving}
                                        >
                                            {isSaving ? '...' : 'Guardar'}
                                        </button>
                                        <button
                                            className="stand-list-item__btn stand-list-item__btn--delete"
                                            onClick={() => handleDelete(stand.id)}
                                            disabled={isDeleting === stand.id}
                                        >
                                            {isDeleting === stand.id ? '...' : 'Eliminar'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

export default StandList
