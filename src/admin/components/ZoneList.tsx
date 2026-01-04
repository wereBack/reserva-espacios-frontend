import { useState } from 'react'
import { useStandStore, type Zone } from '../store/standStore'

const ZoneList = () => {
    const zones = useStandStore((state) => state.zones)
    const updateZone = useStandStore((state) => state.updateZone)
    const removeZone = useStandStore((state) => state.removeZone)

    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [editValues, setEditValues] = useState<{ name: string; price: string; color: string }>({ name: '', price: '', color: '#ffb703' })

    // Get zone type label
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

    // Get dimensions for rect zones
    const getDimensions = (zone: Zone) => {
        if (zone.kind === 'rect') {
            return `${Math.round(zone.width)}×${Math.round(zone.height)} px`
        }
        // For polygon/free, calculate bounding box
        if ('points' in zone && zone.points.length >= 4) {
            const xs = zone.points.filter((_, i) => i % 2 === 0)
            const ys = zone.points.filter((_, i) => i % 2 === 1)
            const width = Math.max(...xs) - Math.min(...xs)
            const height = Math.max(...ys) - Math.min(...ys)
            return `${Math.round(width)}×${Math.round(height)} px`
        }
        return ''
    }

    // Toggle expand/collapse
    const handleToggle = (zone: Zone) => {
        if (expandedId === zone.id) {
            setExpandedId(null)
        } else {
            setExpandedId(zone.id)
            setEditValues({
                name: zone.label || '',
                price: zone.price?.toString() || '',
                color: zone.color || '#ffb703',
            })
        }
    }

    // Save changes
    const handleSave = (zone: Zone) => {
        updateZone(zone.id, {
            label: editValues.name,
            price: editValues.price ? parseFloat(editValues.price) : undefined,
            color: editValues.color,
        })
    }

    // Delete zone
    const handleDelete = (zoneId: string) => {
        if (confirm('¿Eliminar esta zona?')) {
            removeZone(zoneId)
            if (expandedId === zoneId) {
                setExpandedId(null)
            }
        }
    }

    if (zones.length === 0) {
        return (
            <div className="zone-list-panel zone-list-panel--empty">
                <p>No hay zonas creadas</p>
            </div>
        )
    }

    return (
        <div className="zone-list-panel">
            <div className="zone-list-header">
                <h3>🎨 Zonas</h3>
                <span className="zone-list-count">{zones.length}</span>
            </div>

            <ul className="zone-list">
                {zones.map((zone) => {
                    const isExpanded = expandedId === zone.id

                    return (
                        <li
                            key={zone.id}
                            className={`zone-list-item ${isExpanded ? 'zone-list-item--expanded' : ''}`}
                        >
                            <button
                                className="zone-list-item__header"
                                onClick={() => handleToggle(zone)}
                            >
                                <span
                                    className="zone-list-item__color"
                                    style={{ backgroundColor: zone.color }}
                                />
                                <span className="zone-list-item__name">
                                    {zone.label || `Zona ${zone.id.slice(0, 6)}`}
                                </span>
                                {zone.price && (
                                    <span className="zone-list-item__price">
                                        ${zone.price}
                                    </span>
                                )}
                                <span className="zone-list-item__type">
                                    {getTypeLabel(zone.kind)}
                                </span>
                                <span className={`zone-list-item__arrow ${isExpanded ? 'zone-list-item__arrow--up' : ''}`}>
                                    ▼
                                </span>
                            </button>

                            {isExpanded && (
                                <div className="zone-list-item__body">
                                    <div className="zone-list-item__field">
                                        <label>NOMBRE</label>
                                        <input
                                            type="text"
                                            value={editValues.name}
                                            onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                                            placeholder="Nombre de la zona"
                                        />
                                    </div>

                                    <div className="zone-list-item__row">
                                        <div className="zone-list-item__field zone-list-item__field--half">
                                            <label>PRECIO ($)</label>
                                            <input
                                                type="number"
                                                value={editValues.price}
                                                onChange={(e) => setEditValues({ ...editValues, price: e.target.value })}
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                            />
                                        </div>

                                        <div className="zone-list-item__field zone-list-item__field--half">
                                            <label>COLOR</label>
                                            <input
                                                type="color"
                                                value={editValues.color}
                                                onChange={(e) => setEditValues({ ...editValues, color: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="zone-list-item__dimensions">
                                        Tamaño: {getDimensions(zone)}
                                    </div>

                                    <div className="zone-list-item__actions">
                                        <button
                                            className="zone-list-item__btn zone-list-item__btn--save"
                                            onClick={() => handleSave(zone)}
                                        >
                                            💾
                                        </button>
                                        <button
                                            className="zone-list-item__btn zone-list-item__btn--delete"
                                            onClick={() => handleDelete(zone.id)}
                                        >
                                            🗑️
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

export default ZoneList
