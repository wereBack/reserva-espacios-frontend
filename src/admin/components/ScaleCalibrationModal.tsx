import { useState, useEffect } from 'react'
import { useStandStore } from '../store/standStore'

type CalibrationMode = 'distance' | 'dimensions'

interface CalibrationPoint {
    x: number
    y: number
}

interface ScaleCalibrationModalProps {
    isOpen: boolean
    onClose: () => void
    canvasWidth: number
    canvasHeight: number
}

const ScaleCalibrationModal = ({
    isOpen,
    onClose,
    canvasWidth,
    canvasHeight,
}: ScaleCalibrationModalProps) => {
    const [mode, setMode] = useState<CalibrationMode>('distance')
    const [point1, setPoint1] = useState<CalibrationPoint | null>(null)
    const [point2, setPoint2] = useState<CalibrationPoint | null>(null)
    const [distanceMeters, setDistanceMeters] = useState('')
    const [widthMeters, setWidthMeters] = useState('')
    const [heightMeters, setHeightMeters] = useState('')
    const [isSelectingPoints, setIsSelectingPoints] = useState(false)

    const setPixelsPerMeter = useStandStore((state) => state.setPixelsPerMeter)
    const setPlanoRealDimensions = useStandStore((state) => state.setPlanoRealDimensions)
    const setCalibrationPoints = useStandStore((state) => state.setCalibrationPoints)
    const calibrationPoints = useStandStore((state) => state.calibrationPoints)
    const setIsCalibrating = useStandStore((state) => state.setIsCalibrating)

    // Sync calibration points from store
    useEffect(() => {
        if (calibrationPoints.length >= 1) {
            setPoint1(calibrationPoints[0])
        }
        if (calibrationPoints.length >= 2) {
            setPoint2(calibrationPoints[1])
            setIsSelectingPoints(false)
            setIsCalibrating(false)
        }
    }, [calibrationPoints, setIsCalibrating])

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setPoint1(null)
            setPoint2(null)
            setDistanceMeters('')
            setWidthMeters('')
            setHeightMeters('')
            setIsSelectingPoints(false)
            setCalibrationPoints([])
            setIsCalibrating(false)
        }
    }, [isOpen, setCalibrationPoints, setIsCalibrating])

    if (!isOpen) return null

    // Calculate pixel distance between two points
    const pixelDistance = point1 && point2
        ? Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2))
        : 0

    const handleStartPointSelection = () => {
        setPoint1(null)
        setPoint2(null)
        setCalibrationPoints([])
        setIsSelectingPoints(true)
        setIsCalibrating(true)
    }

    const handleApplyDistance = () => {
        const meters = parseFloat(distanceMeters)
        if (meters > 0 && pixelDistance > 0) {
            const ppm = pixelDistance / meters
            setPixelsPerMeter(ppm)
            setCalibrationPoints([])
            onClose()
        }
    }

    const handleApplyDimensions = () => {
        const w = parseFloat(widthMeters)
        const h = parseFloat(heightMeters)
        if (w > 0) {
            setPlanoRealDimensions(w, h > 0 ? h : null)
            onClose()
        }
    }

    const handleSkip = () => {
        setCalibrationPoints([])
        onClose()
    }

    // When selecting points, show minimized floating bar
    if (isOpen && isSelectingPoints && calibrationPoints.length < 2) {
        return (
            <div className="calibration-floating-bar">
                <div className="calibration-floating-bar__content">
                    {!point1 ? (
                        <span>👆 Haz clic en el <strong>primer punto</strong> del plano</span>
                    ) : (
                        <span>👆 Ahora haz clic en el <strong>segundo punto</strong></span>
                    )}
                </div>
                <button
                    className="calibration-floating-bar__cancel"
                    onClick={() => {
                        setIsSelectingPoints(false)
                        setIsCalibrating(false)
                        setCalibrationPoints([])
                    }}
                >
                    Cancelar
                </button>
            </div>
        )
    }

    if (!isOpen) return null

    return (
        <div className="calibration-modal-overlay">
            <div className="calibration-modal">
                <h2 className="calibration-modal__title">📏 Calibrar Escala del Plano</h2>
                <p className="calibration-modal__subtitle">
                    Configura la escala para que los tamaños de stands sean precisos
                </p>

                {/* Tabs */}
                <div className="calibration-modal__tabs">
                    <button
                        className={`calibration-modal__tab ${mode === 'distance' ? 'calibration-modal__tab--active' : ''}`}
                        onClick={() => setMode('distance')}
                    >
                        📐 Medir distancia
                    </button>
                    <button
                        className={`calibration-modal__tab ${mode === 'dimensions' ? 'calibration-modal__tab--active' : ''}`}
                        onClick={() => setMode('dimensions')}
                    >
                        📋 Dimensiones totales
                    </button>
                </div>

                <div className="calibration-modal__content">
                    {mode === 'distance' ? (
                        <div className="calibration-distance">
                            <p className="calibration-distance__help">
                                Selecciona dos puntos en el plano cuya distancia real conozcas
                                (ej: ancho de un pasillo, distancia entre puertas)
                            </p>

                            {!isSelectingPoints && !point2 ? (
                                <button
                                    className="calibration-distance__start-btn"
                                    onClick={handleStartPointSelection}
                                >
                                    Comenzar selección de puntos
                                </button>
                            ) : null}

                            {point1 && point2 && (
                                <div className="calibration-distance__result">
                                    <div className="calibration-distance__pixels">
                                        Distancia medida: <strong>{Math.round(pixelDistance)} px</strong>
                                    </div>
                                    <div className="calibration-distance__input">
                                        <label>¿Cuántos metros son en la realidad?</label>
                                        <input
                                            type="number"
                                            value={distanceMeters}
                                            onChange={(e) => setDistanceMeters(e.target.value)}
                                            placeholder="Ej: 5"
                                            min="0.1"
                                            step="0.1"
                                            autoFocus
                                        />
                                        <span className="calibration-distance__unit">metros</span>
                                    </div>
                                    <button
                                        className="calibration-modal__apply-btn"
                                        onClick={handleApplyDistance}
                                        disabled={!distanceMeters || parseFloat(distanceMeters) <= 0}
                                    >
                                        Aplicar escala
                                    </button>
                                    <button
                                        className="calibration-distance__retry"
                                        onClick={handleStartPointSelection}
                                    >
                                        Volver a medir
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="calibration-dimensions">
                            <p className="calibration-dimensions__help">
                                Ingresa las dimensiones reales del área que muestra el plano
                            </p>
                            <div className="calibration-dimensions__fields">
                                <div className="calibration-dimensions__field">
                                    <label>Ancho real (metros)</label>
                                    <input
                                        type="number"
                                        value={widthMeters}
                                        onChange={(e) => setWidthMeters(e.target.value)}
                                        placeholder="Ej: 50"
                                        min="1"
                                        step="1"
                                    />
                                </div>
                                <div className="calibration-dimensions__field">
                                    <label>Alto real (metros) - opcional</label>
                                    <input
                                        type="number"
                                        value={heightMeters}
                                        onChange={(e) => setHeightMeters(e.target.value)}
                                        placeholder="Ej: 30"
                                        min="1"
                                        step="1"
                                    />
                                </div>
                            </div>
                            <div className="calibration-dimensions__preview">
                                Imagen: {canvasWidth} × {canvasHeight} px
                            </div>
                            <button
                                className="calibration-modal__apply-btn"
                                onClick={handleApplyDimensions}
                                disabled={!widthMeters || parseFloat(widthMeters) <= 0}
                            >
                                Aplicar escala
                            </button>
                        </div>
                    )}
                </div>

                {/* Skip option - subtle */}
                <button className="calibration-modal__skip" onClick={handleSkip}>
                    Continuar sin escala
                </button>
            </div>
        </div>
    )
}

export default ScaleCalibrationModal
