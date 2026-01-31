import { useEffect, useMemo, useRef, useState } from 'react'
import { Group, Layer, Rect, Stage, Text, Image as KonvaImage } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { PlanoData, SpaceData, ZoneData } from '../services/api'
import { useElementSize } from '../../hooks/useElementSize'
import { useIsMobile } from '../../hooks/useIsMobile'
import { toProxyUrl } from '../../utils/imageProxy'

type PlanoMapProps = {
    plano: PlanoData
    selectedSpaceId: string | null
    onSelectSpace: (spaceId: string) => void
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
    disponible: { bg: '#dcfce7', color: '#16a34a' },
    pendiente: { bg: '#fef3c7', color: '#f59e0b' },
    reservado: { bg: '#fee2e2', color: '#dc2626' },
    bloqueado: { bg: '#e2e8f0', color: '#64748b' },
}

const PlanoMap = ({ plano, selectedSpaceId, onSelectSpace }: PlanoMapProps) => {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const size = useElementSize(containerRef)
    const isMobile = useIsMobile(768)
    const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null)

    // Use actual image dimensions when available, fallback to plano dimensions
    const canvasWidth = backgroundImage?.naturalWidth || plano.width
    const canvasHeight = backgroundImage?.naturalHeight || plano.height
    const aspectRatio = canvasWidth / canvasHeight

    const stageDimensions = useMemo(() => {
        // Always use full available width
        const width = size.width || 800
        // Calculate height based on aspect ratio
        const height = width / aspectRatio
        const scale = width / canvasWidth
        return { width, height, scale }
    }, [size.width, aspectRatio, canvasWidth])

    useEffect(() => {
        if (!plano.url) {
            setBackgroundImage(null)
            return
        }

        // Convertir URL de S3 a URL del proxy para evitar CORS
        const imageUrl = toProxyUrl(plano.url)

        const img = new window.Image()
        img.crossOrigin = 'anonymous'

        img.src = imageUrl

        img.onload = () => {
            setBackgroundImage(img)
        }
        img.onerror = (err) => {
            console.error('Error loading background image:', err)
            setBackgroundImage(null)
        }

        return () => {
            setBackgroundImage(null)
        }
    }, [plano.url])

    const handleSelect = (event: KonvaEventObject<MouseEvent | TouchEvent>, space: SpaceData) => {
        event.cancelBubble = true
        onSelectSpace(space.id)
    }

    const getSpaceStatus = (space: SpaceData): string => {
        if (!space.active) return 'bloqueado'
        if (space.reservations && space.reservations.length > 0) {
            const activeReservation = space.reservations.find(r => r.estado === 'RESERVED' || r.estado === 'PENDING' || r.estado === 'CANCELLATION_REQUESTED')
            if (activeReservation?.estado === 'PENDING') return 'pendiente'
            // CANCELLATION_REQUESTED se muestra como reservado hasta que el admin apruebe
            if (activeReservation?.estado === 'RESERVED' || activeReservation?.estado === 'CANCELLATION_REQUESTED') return 'reservado'
        }
        return 'disponible'
    }

    return (
        <div ref={containerRef} className="stand-map__shell">
            <div
                className="stand-map__stage-wrapper"
                style={{
                    width: '100%',
                    height: stageDimensions.height,
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}
            >
                <Stage
                    width={stageDimensions.width}
                    height={stageDimensions.height}
                >
                    {/* Background layer */}
                    <Layer listening={false}>
                        {backgroundImage ? (
                            <KonvaImage
                                image={backgroundImage}
                                width={canvasWidth * stageDimensions.scale}
                                height={canvasHeight * stageDimensions.scale}
                                listening={false}
                            />
                        ) : (
                            <Rect
                                x={0}
                                y={0}
                                width={canvasWidth * stageDimensions.scale}
                                height={canvasHeight * stageDimensions.scale}
                                fill="#f4f5f7"
                                listening={false}
                            />
                        )}
                    </Layer>

                    {/* Zones layer */}
                    <Layer listening={false}>
                        {plano.zones.map((zone: ZoneData) => {
                            const rotation = zone.rotation || 0
                            const centerX = (zone.x + zone.width / 2) * stageDimensions.scale
                            const centerY = (zone.y + zone.height / 2) * stageDimensions.scale

                            return (
                                <Group
                                    key={zone.id}
                                    x={centerX}
                                    y={centerY}
                                    rotation={rotation}
                                >
                                    <Rect
                                        x={(-zone.width / 2) * stageDimensions.scale}
                                        y={(-zone.height / 2) * stageDimensions.scale}
                                        width={zone.width * stageDimensions.scale}
                                        height={zone.height * stageDimensions.scale}
                                        fill={zone.color}
                                        opacity={0.3}
                                        stroke={zone.color}
                                        strokeWidth={2}
                                        listening={false}
                                    />
                                </Group>
                            )
                        })}
                    </Layer>

                    {/* Spaces (stands) layer */}
                    <Layer>
                        {plano.spaces.map((space: SpaceData) => {
                            const status = getSpaceStatus(space)
                            const meta = STATUS_COLORS[status] || STATUS_COLORS.disponible
                            const isSelected = selectedSpaceId === space.id
                            const rotation = space.rotation || 0

                            const centerX = (space.x + space.width / 2) * stageDimensions.scale
                            const centerY = (space.y + space.height / 2) * stageDimensions.scale

                            return (
                                <Group
                                    key={space.id}
                                    x={centerX}
                                    y={centerY}
                                    rotation={rotation}
                                    onClick={(event) => handleSelect(event, space)}
                                    onTap={(event) => handleSelect(event, space)}
                                >
                                    <Rect
                                        x={(-space.width / 2) * stageDimensions.scale}
                                        y={(-space.height / 2) * stageDimensions.scale}
                                        width={space.width * stageDimensions.scale}
                                        height={space.height * stageDimensions.scale}
                                        cornerRadius={6}
                                        fill={meta.bg}
                                        stroke={isSelected ? '#0f172a' : meta.color}
                                        strokeWidth={isSelected ? 3 : 2}
                                    />
                                    {!isMobile && (
                                        <Text
                                            x={(-space.width / 2) * stageDimensions.scale}
                                            y={(-13 * stageDimensions.scale) / 2}
                                            width={space.width * stageDimensions.scale}
                                            text={space.name}
                                            fontSize={13 * stageDimensions.scale}
                                            fontStyle="600"
                                            fill="#0f172a"
                                            align="center"
                                            verticalAlign="middle"
                                            height={space.height * stageDimensions.scale}
                                            listening={false}
                                        />
                                    )}
                                </Group>
                            )
                        })}
                    </Layer>
                </Stage>
            </div>
        </div>
    )
}

export default PlanoMap
