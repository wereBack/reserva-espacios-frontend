import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useStandStore } from '../store/standStore'

const MeasuredSizeModal = () => {
    const isOpen = useStandStore((state) => state.showMeasuredModal)
    const setShowMeasuredModal = useStandStore((state) => state.setShowMeasuredModal)
    const measuredWidth = useStandStore((state) => state.measuredWidth)
    const measuredHeight = useStandStore((state) => state.measuredHeight)
    const setMeasuredWidth = useStandStore((state) => state.setMeasuredWidth)
    const setMeasuredHeight = useStandStore((state) => state.setMeasuredHeight)
    const hasScale = useStandStore((state) => state.hasScale)
    const addCustomPreset = useStandStore((state) => state.addCustomPreset)
    const customPresets = useStandStore((state) => state.customPresets)
    const removeCustomPreset = useStandStore((state) => state.removeCustomPreset)

    const [width, setWidth] = useState(measuredWidth.toString())
    const [height, setHeight] = useState(measuredHeight.toString())
    const [presetName, setPresetName] = useState('')
    const [saveAsPreset, setSaveAsPreset] = useState(false)
    const widthInputRef = useRef<HTMLInputElement>(null)

    const unit = hasScale() ? 'm' : 'px'
    const unitLabel = hasScale() ? 'metros' : 'píxeles'

    useEffect(() => {
        if (isOpen) {
            setWidth(measuredWidth.toString())
            setHeight(measuredHeight.toString())
            setPresetName('')
            setSaveAsPreset(false)
            setTimeout(() => widthInputRef.current?.focus(), 100)
        }
    }, [isOpen, measuredWidth, measuredHeight])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const w = parseFloat(width)
        const h = parseFloat(height)

        if (w > 0 && h > 0) {
            setMeasuredWidth(w)
            setMeasuredHeight(h)

            // Save as preset if requested
            if (saveAsPreset && presetName.trim()) {
                const id = `custom-${Date.now()}`
                const label = presetName.trim() || `${w} x ${h} ${unit}`
                addCustomPreset({ id, label, width: w, height: h })
            }

            setShowMeasuredModal(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setShowMeasuredModal(false)
        }
    }

    const handlePresetSelect = (preset: { width: number; height: number }) => {
        setWidth(preset.width.toString())
        setHeight(preset.height.toString())
    }

    if (!isOpen) return null

    // Use portal to render outside of any container with overflow issues
    return createPortal(
        <div className="measured-modal-overlay" onKeyDown={handleKeyDown}>
            <div className="measured-modal">
                <div className="measured-modal__header">
                    <h3>📐 Dimensiones del Stand</h3>
                    <button
                        className="measured-modal__close"
                        onClick={() => setShowMeasuredModal(false)}
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="measured-modal__form">
                    <p className="measured-modal__help">
                        {hasScale()
                            ? 'Ingresa las dimensiones en metros. La escala ya está calibrada.'
                            : 'Ingresa las dimensiones en píxeles. Calibra la escala para usar metros.'
                        }
                    </p>

                    {/* Saved presets dropdown */}
                    {customPresets.length > 0 && (
                        <div className="measured-modal__presets">
                            <label className="measured-modal__presets-label">Tamaños guardados:</label>
                            <div className="measured-modal__presets-list">
                                {customPresets.map((preset) => (
                                    <div key={preset.id} className="measured-modal__preset-item">
                                        <button
                                            type="button"
                                            className={`measured-modal__preset-btn ${width === preset.width.toString() && height === preset.height.toString()
                                                    ? 'measured-modal__preset-btn--active'
                                                    : ''
                                                }`}
                                            onClick={() => handlePresetSelect(preset)}
                                        >
                                            {preset.label}
                                        </button>
                                        <button
                                            type="button"
                                            className="measured-modal__preset-delete"
                                            onClick={() => removeCustomPreset(preset.id)}
                                            title="Eliminar"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="measured-modal__dimensions">
                        <div className="measured-modal__field">
                            <label>Ancho ({unitLabel})</label>
                            <input
                                ref={widthInputRef}
                                type="number"
                                value={width}
                                onChange={(e) => setWidth(e.target.value)}
                                placeholder={hasScale() ? "3" : "100"}
                                min="0.1"
                                step="any"
                            />
                        </div>
                        <span className="measured-modal__x">×</span>
                        <div className="measured-modal__field">
                            <label>Alto ({unitLabel})</label>
                            <input
                                type="number"
                                value={height}
                                onChange={(e) => setHeight(e.target.value)}
                                placeholder={hasScale() ? "2" : "80"}
                                min="0.1"
                                step="any"
                            />
                        </div>
                    </div>

                    <div className="measured-modal__preview">
                        Tamaño: <strong>{width || '0'} × {height || '0'} {unit}</strong>
                    </div>

                    {/* Save as preset option */}
                    <div className="measured-modal__save-preset">
                        <label className="measured-modal__checkbox">
                            <input
                                type="checkbox"
                                checked={saveAsPreset}
                                onChange={(e) => setSaveAsPreset(e.target.checked)}
                            />
                            <span>Guardar como tamaño predefinido</span>
                        </label>

                        {saveAsPreset && (
                            <div className="measured-modal__preset-name">
                                <input
                                    type="text"
                                    value={presetName}
                                    onChange={(e) => setPresetName(e.target.value)}
                                    placeholder={`${width} x ${height} ${unit}`}
                                />
                            </div>
                        )}
                    </div>

                    <div className="measured-modal__actions">
                        <button
                            type="button"
                            className="measured-modal__btn measured-modal__btn--cancel"
                            onClick={() => setShowMeasuredModal(false)}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="measured-modal__btn measured-modal__btn--confirm"
                            disabled={!width || !height || parseFloat(width) <= 0 || parseFloat(height) <= 0}
                        >
                            Aplicar
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}

export default MeasuredSizeModal

