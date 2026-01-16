import { useState, useEffect, useRef } from 'react'

interface ShapeCreationModalProps {
    isOpen: boolean
    type: 'stand' | 'zone'
    defaultName: string
    defaultColor: string
    defaultPrice?: number
    onConfirm: (data: { name: string; color: string; price?: number; description?: string }) => void
    onCancel: () => void
}

const ShapeCreationModal = ({
    isOpen,
    type,
    defaultName,
    defaultColor,
    defaultPrice,
    onConfirm,
    onCancel,
}: ShapeCreationModalProps) => {
    const [name, setName] = useState(defaultName)

    const [color, setColor] = useState(defaultColor)
    const [price, setPrice] = useState(defaultPrice?.toString() || '')
    const [description, setDescription] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isOpen) {
            setName(defaultName)
            setColor(defaultColor)
            setPrice(defaultPrice?.toString() || '')
            setDescription('')
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }, [isOpen, defaultName, defaultColor, defaultPrice])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onConfirm({
            name: name.trim() || defaultName,
            color,
            price: price ? parseFloat(price) : undefined,
            description: description.trim() || undefined,
        })
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onCancel()
        }
    }

    if (!isOpen) return null

    return (
        <div className="shape-modal-overlay" onKeyDown={handleKeyDown}>
            <div className="shape-modal">
                <div className="shape-modal__header">
                    <h3>{type === 'stand' ? 'Nuevo Stand' : 'Nueva Zona'}</h3>
                    <button className="shape-modal__close" onClick={onCancel}>×</button>
                </div>

                <form onSubmit={handleSubmit} className="shape-modal__form">
                    <div className="shape-modal__field">
                        <label>Nombre</label>
                        <input
                            ref={inputRef}
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={defaultName}
                        />
                    </div>

                    {type === 'zone' && (
                        <div className="shape-modal__field">
                            <label>Color</label>
                            <div className="shape-modal__color-row">
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                />
                                <input
                                    type="text"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    placeholder="#ffb703"
                                />
                            </div>
                        </div>
                    )}

                    <div className="shape-modal__field">
                        <label>Precio (USD)</label>
                        <input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder="0"
                            min="0"
                            step="0.01"
                        />
                    </div>

                    {type === 'zone' && (
                        <div className="shape-modal__field">
                            <label>Descripción</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Descripción de la zona..."
                                rows={2}
                            />
                        </div>
                    )}

                    <div className="shape-modal__actions">
                        <button type="button" className="shape-modal__btn shape-modal__btn--cancel" onClick={onCancel}>
                            Cancelar
                        </button>
                        <button type="submit" className="shape-modal__btn shape-modal__btn--confirm">
                            Crear {type === 'stand' ? 'Stand' : 'Zona'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default ShapeCreationModal
