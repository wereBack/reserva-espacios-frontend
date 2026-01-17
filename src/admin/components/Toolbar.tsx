import { useState, useRef } from 'react'
import { useStandStore } from '../store/standStore'

type ToolbarMode = 'stands' | 'zones'

const STAND_TOOLS = [
  { id: 'stand-rect', label: 'Rectángulo', desc: 'Dibuja stands rectangulares' },
] as const

const ZONE_TOOLS = [
  { id: 'zone-rect', label: 'Zona rectangular', desc: 'Área rectangular grande' },
] as const

const Toolbar = () => {
  const [toolbarMode, setToolbarMode] = useState<ToolbarMode>('stands')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Scale configuration local state
  const [ppmInput, setPpmInput] = useState('')

  const mode = useStandStore((state) => state.mode)
  const setMode = useStandStore((state) => state.setMode)
  const stands = useStandStore((state) => state.stands)
  const zones = useStandStore((state) => state.zones)
  const undoLast = useStandStore((state) => state.undoLast)
  const backgroundUrl = useStandStore((state) => state.backgroundUrl)
  const setBackgroundUrl = useStandStore((state) => state.setBackgroundUrl)
  const setBackgroundFile = useStandStore((state) => state.setBackgroundFile)
  const backgroundFile = useStandStore((state) => state.backgroundFile)
  const saveBackgroundImage = useStandStore((state) => state.saveBackgroundImage)
  const isSavingImage = useStandStore((state) => state.isSavingImage)
  const planoId = useStandStore((state) => state.planoId)
  const planoName = useStandStore((state) => state.planoName)

  // Grid controls
  const snapToGrid = useStandStore((state) => state.snapToGrid)
  const setSnapToGrid = useStandStore((state) => state.setSnapToGrid)
  const showGrid = useStandStore((state) => state.showGrid)
  const setShowGrid = useStandStore((state) => state.setShowGrid)
  const gridSize = useStandStore((state) => state.gridSize)
  const setGridSize = useStandStore((state) => state.setGridSize)
  const gridUnit = useStandStore((state) => state.gridUnit)
  const setGridUnit = useStandStore((state) => state.setGridUnit)

  // Scale configuration
  const pixelsPerMeter = useStandStore((state) => state.pixelsPerMeter)
  const setPixelsPerMeter = useStandStore((state) => state.setPixelsPerMeter)
  const setShowCalibrationModal = useStandStore((state) => state.setShowCalibrationModal)
  const hasScale = useStandStore((state) => state.hasScale)
  
  // Size mode
  const sizeMode = useStandStore((state) => state.sizeMode)
  const setSizeMode = useStandStore((state) => state.setSizeMode)
  const setShowMeasuredModal = useStandStore((state) => state.setShowMeasuredModal)
  const customPresets = useStandStore((state) => state.customPresets)
  const removeCustomPreset = useStandStore((state) => state.removeCustomPreset)
  const measuredWidth = useStandStore((state) => state.measuredWidth)
  const measuredHeight = useStandStore((state) => state.measuredHeight)

  const hasShapes = stands.length + zones.length > 0
  const currentTools = toolbarMode === 'stands' ? STAND_TOOLS : ZONE_TOOLS
  const isEditingArea = planoId || planoName

  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setBackgroundFile(file)
      const url = URL.createObjectURL(file)
      setBackgroundUrl(url)
      // Show calibration modal when new image is loaded
      setShowCalibrationModal(true)
    }
  }

  // Switch to select mode when changing toolbar mode
  const handleModeSwitch = (newMode: ToolbarMode) => {
    setToolbarMode(newMode)
    setMode('select')
  }

  return (
    <div className="toolbar-panel">
      {/* Mode Tabs */}
      <div className="toolbar-tabs">
        <button
          className={`toolbar-tab ${toolbarMode === 'stands' ? 'toolbar-tab--active' : ''}`}
          onClick={() => handleModeSwitch('stands')}
        >
          <span className="toolbar-tab__count">{stands.length}</span>
          Stands
        </button>
        <button
          className={`toolbar-tab ${toolbarMode === 'zones' ? 'toolbar-tab--active' : ''}`}
          onClick={() => handleModeSwitch('zones')}
        >
          <span className="toolbar-tab__count">{zones.length}</span>
          Zonas
        </button>
      </div>

      {/* Tools Section */}
      <div className="toolbar-section">
        <h4 className="toolbar-section__title">Herramientas</h4>

        <div className="toolbar-tools">
          <button
            className={`toolbar-tool ${(mode === 'select' || mode === 'zone-select') ? 'toolbar-tool--active' : ''}`}
            onClick={() => setMode(toolbarMode === 'zones' ? 'zone-select' : 'select')}
          >
            <div className="toolbar-tool__icon">↖</div>
            <div className="toolbar-tool__info">
              <span className="toolbar-tool__name">Seleccionar</span>
              <span className="toolbar-tool__desc">
                {toolbarMode === 'zones' ? 'Mover y editar zonas' : 'Mover y editar stands'}
              </span>
            </div>
          </button>

          {currentTools.map((tool) => (
            <button
              key={tool.id}
              className={`toolbar-tool ${mode === tool.id ? 'toolbar-tool--active' : ''}`}
              onClick={() => setMode(tool.id)}
            >
              <div className="toolbar-tool__icon">
                {tool.id.includes('rect') ? '▬' :
                  tool.id.includes('polygon') ? '⬡' :
                    tool.id.includes('paint') ? '◉' : '〰'}
              </div>
              <div className="toolbar-tool__info">
                <span className="toolbar-tool__name">{tool.label}</span>
                <span className="toolbar-tool__desc">{tool.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Size Mode - only for stands */}
      {toolbarMode === 'stands' && (
        <div className="toolbar-section">
          <h4 className="toolbar-section__title">Modo de tamaño</h4>
          <div className="toolbar-size-modes">
            <button
              className={`toolbar-size-mode ${sizeMode === 'free' ? 'toolbar-size-mode--active' : ''}`}
              onClick={() => setSizeMode('free')}
            >
              <div className="toolbar-size-mode__icon">↔</div>
              <div className="toolbar-size-mode__info">
                <span className="toolbar-size-mode__name">Libre</span>
                <span className="toolbar-size-mode__desc">Arrastra para definir tamaño</span>
              </div>
            </button>
            <button
              className={`toolbar-size-mode ${sizeMode === 'measured' ? 'toolbar-size-mode--active' : ''}`}
              onClick={() => {
                setSizeMode('measured')
                setShowMeasuredModal(true)
              }}
            >
              <div className="toolbar-size-mode__icon">📐</div>
              <div className="toolbar-size-mode__info">
                <span className="toolbar-size-mode__name">Medido</span>
                <span className="toolbar-size-mode__desc">
                  {sizeMode === 'measured' 
                    ? `${measuredWidth} x ${measuredHeight} ${hasScale() ? 'm' : 'px'}`
                    : 'Ingresa dimensiones exactas'
                  }
                </span>
              </div>
            </button>
          </div>
          
          {/* Custom presets */}
          {customPresets.length > 0 && (
            <div className="toolbar-custom-presets">
              <span className="toolbar-custom-presets__label">Guardados:</span>
              <div className="toolbar-presets">
                {customPresets.map((preset) => (
                  <div key={preset.id} className="toolbar-preset-chip">
                    <button
                      className={`toolbar-preset-chip__btn ${sizeMode === 'measured' && measuredWidth === preset.width && measuredHeight === preset.height ? 'toolbar-preset-chip__btn--active' : ''}`}
                      onClick={() => {
                        setSizeMode('measured')
                        useStandStore.getState().setMeasuredWidth(preset.width)
                        useStandStore.getState().setMeasuredHeight(preset.height)
                      }}
                    >
                      {preset.label}
                    </button>
                    <button
                      className="toolbar-preset-chip__delete"
                      onClick={() => removeCustomPreset(preset.id)}
                      title="Eliminar preset"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Color picker for zones */}


      {/* Grid Controls Section */}
      <div className="toolbar-section">
        <h4 className="toolbar-section__title">📐 Cuadriculado</h4>

        <div className="toolbar-grid-controls">
          <label className="toolbar-toggle">
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={(e) => setSnapToGrid(e.target.checked)}
            />
            <span className="toolbar-toggle__label">Ajustar a cuadrícula</span>
          </label>

          <label className="toolbar-toggle">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
            />
            <span className="toolbar-toggle__label">Mostrar cuadrícula</span>
          </label>

          {/* Unit toggle - only show if scale is calibrated */}
          {hasScale() && (
            <div className="toolbar-grid-unit">
              <span className="toolbar-grid-unit__label">Unidad:</span>
              <div className="toolbar-grid-unit__buttons">
                <button
                  className={`toolbar-grid-unit__btn ${gridUnit === 'meters' ? 'toolbar-grid-unit__btn--active' : ''}`}
                  onClick={() => {
                    setGridUnit('meters')
                    setGridSize(1) // Default to 1 meter
                  }}
                >
                  Metros
                </button>
                <button
                  className={`toolbar-grid-unit__btn ${gridUnit === 'pixels' ? 'toolbar-grid-unit__btn--active' : ''}`}
                  onClick={() => {
                    setGridUnit('pixels')
                    setGridSize(20) // Default to 20 pixels
                  }}
                >
                  Píxeles
                </button>
              </div>
            </div>
          )}

          <div className="toolbar-grid-size">
            <span className="toolbar-grid-size__label">Tamaño:</span>
            <div className="toolbar-grid-size__buttons">
              {gridUnit === 'meters' && hasScale() ? (
                <>
                  {[0.5, 1, 2].map((size) => (
                    <button
                      key={size}
                      className={`toolbar-grid-size__btn ${gridSize === size ? 'toolbar-grid-size__btn--active' : ''}`}
                      onClick={() => setGridSize(size)}
                    >
                      {size}m
                    </button>
                  ))}
                </>
              ) : (
                <>
                  {[10, 20, 50].map((size) => (
                    <button
                      key={size}
                      className={`toolbar-grid-size__btn ${gridSize === size ? 'toolbar-grid-size__btn--active' : ''}`}
                      onClick={() => setGridSize(size)}
                    >
                      {size}px
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scale Configuration Section */}
      {isEditingArea && (
        <div className="toolbar-section">
          <h4 className="toolbar-section__title">📏 Escala del Plano</h4>

          <div className="toolbar-scale">
            <div className="toolbar-scale__manual">
              <div className="toolbar-scale__field">
                <label>Píxeles por metro</label>
                <input
                  type="number"
                  value={ppmInput || pixelsPerMeter.toString()}
                  onChange={(e) => setPpmInput(e.target.value)}
                  min="1"
                  step="1"
                />
              </div>
              <button
                className="toolbar-scale__apply"
                onClick={() => {
                  const ppm = parseFloat(ppmInput)
                  if (ppm > 0) {
                    setPixelsPerMeter(ppm)
                    setPpmInput('')
                  }
                }}
              >
                Aplicar
              </button>
            </div>

            <div className="toolbar-scale__info">
              1m = {Math.round(pixelsPerMeter)}px
            </div>

            <button
              className="toolbar-btn toolbar-btn--secondary"
              style={{ marginTop: '0.75rem', width: '100%' }}
              onClick={() => setShowCalibrationModal(true)}
            >
              📏 Asistente de Calibración
            </button>
          </div>
        </div>
      )}

      {/* Background Image Section */}
      {isEditingArea && (
        <div className="toolbar-section">
          <h4 className="toolbar-section__title">Imagen de fondo</h4>
          <div className="toolbar-background">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
            {backgroundUrl ? (
              <div className="toolbar-background__preview">
                <img src={backgroundUrl} alt="Fondo" />
                <div className="toolbar-background__buttons">
                  <button
                    className="toolbar-background__change"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Cambiar
                  </button>
                  {backgroundFile && (
                    <button
                      className="toolbar-background__save"
                      onClick={saveBackgroundImage}
                      disabled={isSavingImage}
                    >
                      {isSavingImage ? '...' : 'Guardar'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <button
                className="toolbar-background__add"
                onClick={() => fileInputRef.current?.click()}
              >
                + Seleccionar imagen
              </button>
            )}
          </div>
        </div>
      )}

      {/* Undo button - pequeño y discreto */}
      {hasShapes && (
        <div className="toolbar-section toolbar-section--actions">
          <button
            onClick={undoLast}
            className="toolbar-undo-btn"
            title="Deshacer último elemento"
          >
            ↩ Deshacer
          </button>
        </div>
      )}
    </div>
  )
}

export default Toolbar
