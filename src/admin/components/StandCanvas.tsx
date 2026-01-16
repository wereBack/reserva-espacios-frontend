import { type ReactNode, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import Konva from 'konva'
import { Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text } from 'react-konva'
import { toProxyUrl } from '../../utils/imageProxy'
import type { KonvaEventObject } from 'konva/lib/Node'
import type {
  DrawingMode,
  RectPreset,
  RectShape,
  Stand,
  Zone,
} from '../store/standStore'
import { useStandStore } from '../store/standStore'
import CanvasControls from '../../components/CanvasControls'
import ShapeCreationModal from './ShapeCreationModal'

type Subject = 'stand' | 'zone'
type ToolAction = 'select' | 'rect'
type DraftTool = 'rect'
type DraftContext = { subject: Subject; tool: DraftTool } | null

type StandCanvasProps = {
  backgroundSrc?: string
}

const MIN_SHAPE_SIZE = 8
const LABEL_FONT_SIZE = 13
const LABEL_MIN_WIDTH = 60

const getShapeBounds = (shape: RectShape) => {
  return {
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
  }
}

const renderStandLabel = (shape: Stand) => {
  if (!shape.label) {
    return null
  }
  const bounds = getShapeBounds(shape)
  const width = Math.max(bounds.width, LABEL_MIN_WIDTH)
  const x = bounds.x + bounds.width / 2 - width / 2
  const y = bounds.y + bounds.height / 2 - LABEL_FONT_SIZE / 2

  return (
    <Text
      key={`label-${shape.id}`}
      x={x}
      y={y}
      width={width}
      text={shape.label}
      fontSize={LABEL_FONT_SIZE}
      fontStyle="600"
      fill="#0f172a"
      align="center"
      listening={false}
      shadowColor="rgba(15, 23, 42, 0.3)"
      shadowBlur={4}
      shadowOffsetY={1}
      padding={2}
    />
  )
}

const parseMode = (mode: DrawingMode): { subject: Subject; tool: ToolAction } => {
  if (mode === 'select') {
    return { subject: 'stand', tool: 'select' }
  }
  const [rawSubject, rawTool] = mode.split('-')
  const subject: Subject = rawSubject === 'zone' ? 'zone' : 'stand'
  const tool = (rawTool ?? 'rect') as ToolAction
  return { subject, tool }
}

const buildRectDraft = (
  start: { x: number; y: number },
  current: { x: number; y: number },
  color: string,
  preset: RectPreset | null,
): Omit<RectShape, 'id'> => {
  if (preset) {
    const width = preset.width
    const height = preset.height
    const directionX = current.x < start.x ? -1 : 1
    const directionY = current.y < start.y ? -1 : 1
    const x = directionX === -1 ? start.x - width : start.x
    const y = directionY === -1 ? start.y - height : start.y
    return {
      kind: 'rect',
      x,
      y,
      width,
      height,
      color,
    }
  }

  const width = current.x - start.x
  const height = current.y - start.y
  const x = width < 0 ? current.x : start.x
  const y = height < 0 ? current.y : start.y

  return {
    kind: 'rect',
    x,
    y,
    width: Math.abs(width),
    height: Math.abs(height),
    color,
  }
}

const StandCanvas = ({ backgroundSrc }: StandCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage | null>(null)

  const stands = useStandStore((state) => state.stands)
  const zones = useStandStore((state) => state.zones)
  const mode = useStandStore((state) => state.mode)
  const color = useStandStore((state) => state.color)
  const selectedStandId = useStandStore((state) => state.selectedStandId)
  const addStand = useStandStore((state) => state.addStand)
  const addZone = useStandStore((state) => state.addZone)
  const updateStand = useStandStore((state) => state.updateStand)
  const selectStand = useStandStore((state) => state.selectStand)
  const rectPresetId = useStandStore((state) => state.rectPresetId)
  const presets = useStandStore((state) => state.presets)
  const selectedZoneId = useStandStore((state) => state.selectedZoneId)
  const selectZone = useStandStore((state) => state.selectZone)
  const updateZone = useStandStore((state) => state.updateZone)

  const [scale, setScale] = useState(1)
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 })
  console.log('stagePosition', stagePosition)
  const [displayWidth, setDisplayWidth] = useState(0)
  const [displayHeight, setDisplayHeight] = useState(0)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null)
  const [rectDraft, setRectDraft] = useState<RectShape | null>(null)
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(null)

  const [draftContext, setDraftContext] = useState<DraftContext>(null)

  // Pending shape for modal confirmation
  const [pendingShape, setPendingShape] = useState<{
    shape: RectShape | Stand
    subject: Subject
  } | null>(null)

  const rectPreset = useMemo(
    () => presets.find((p) => p.id === rectPresetId) ?? null,
    [presets, rectPresetId],
  )
  const modeMeta = useMemo(() => parseMode(mode), [mode])

  // Reset view helper
  const resetView = useCallback(() => {
    if (!containerRef.current) return
    const { clientWidth, clientHeight } = containerRef.current
    setDisplayWidth(clientWidth)
    setDisplayHeight(clientHeight)

    if (canvasSize.width > 0 && canvasSize.height > 0) {
      const scaleX = clientWidth / canvasSize.width
      const scaleY = clientHeight / canvasSize.height
      const newScale = Math.min(scaleX, scaleY) * 0.9
      setScale(newScale)
      setStagePosition({
        x: (clientWidth - canvasSize.width * newScale) / 2,
        y: (clientHeight - canvasSize.height * newScale) / 2,
      })
    } else {
      setScale(1)
      setStagePosition({ x: 0, y: 0 })
    }
  }, [canvasSize])

  // Load background image
  useEffect(() => {
    if (!backgroundSrc) return

    const proxyUrl = toProxyUrl(backgroundSrc)
    const image = new Image()
    image.crossOrigin = 'Anonymous'

    const loadImage = async () => {
      try {
        await new Promise((resolve, reject) => {
          image.onload = resolve
          image.onerror = reject
          image.src = proxyUrl
        })
      } catch (error) {
        console.error('Failed to load image via proxy, trying direct URL', error)
        image.src = backgroundSrc
      }
    }

    image.onload = () => {
      setBackgroundImage(image)
      setCanvasSize({ width: image.width, height: image.height })
      resetView()
    }

    if (!proxyUrl.includes('localhost')) {
      image.src = proxyUrl
    } else {
      // Local development fallback
      const imageUrl = backgroundSrc.startsWith('http')
        ? backgroundSrc
        : `${import.meta.env.VITE_API_URL}${backgroundSrc}`
      image.src = imageUrl
    }

    loadImage()
  }, [backgroundSrc, setCanvasSize])

  const resetDrafts = () => {
    setRectDraft(null)
    setRectStart(null)

    setDraftContext(null)
  }

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        resetDrafts()
        selectStand(null)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectStand])

  // Controls handlers
  const zoomIn = () => setScale((s) => Math.min(s * 1.2, MAX_SCALE))
  const zoomOut = () => setScale((s) => Math.max(s / 1.2, MIN_SCALE))
  const fitToScreen = resetView

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return

    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    }

    const direction = e.evt.deltaY > 0 ? -1 : 1
    const newScale =
      direction > 0
        ? Math.min(oldScale * 1.05, MAX_SCALE)
        : Math.max(oldScale / 1.05, MIN_SCALE)

    stage.scale({ x: newScale, y: newScale })

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    }
    stage.position(newPos)
    setStagePosition(newPos)
    setScale(newScale)
  }

  const getPointerPosition = () => {
    const stage = stageRef.current
    if (!stage) return null
    const transform = stage.getAbsoluteTransform().copy()
    transform.invert()
    const pos = stage.getPointerPosition()
    if (!pos) return null
    return transform.point(pos)
  }

  const commitShape = (shape: RectShape | Stand, _subject: Subject) => {
    setPendingShape({ shape, subject: _subject })
  }

  const handleModalConfirm = (
    data: { name: string; color: string; price?: number; description?: string }
  ) => {
    if (!pendingShape) return

    const { shape, subject } = pendingShape
    const shapeWithMeta = {
      ...shape,
      label: data.name,
      color: data.color, // Color confirmado (para zona) o heredado
      price: data.price, // Precio confirmado heredado o nuevo
      description: data.description, // Descripción
    }

    if (subject === 'stand') {
      addStand(shapeWithMeta as Stand)
    } else {
      addZone({ ...shapeWithMeta, kind: 'rect' } as Zone)
    }

    setPendingShape(null)
    resetDrafts()
  }

  const handleModalCancel = () => {
    setPendingShape(null)
  }

  const handleStageMouseDown = () => {
    const pos = getPointerPosition()
    if (!pos) return

    // If selecting, clear selection on empty click
    if (modeMeta.tool === 'select') {
      const stage = stageRef.current
      if (stage?.getPointerPosition()) {
        const clickedShape = stage.getIntersection(stage.getPointerPosition()!)
        if (!clickedShape) {
          selectStand(null)
          selectZone(null)
        }
      }
      return
    }

    if (modeMeta.tool === 'rect') {
      setDraftContext({ subject: modeMeta.subject, tool: 'rect' })
      setRectDraft({
        id: 'draft',
        kind: 'rect',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        color,
      })
      setRectStart(pos)
      return
    }

    if (modeMeta.tool === 'select') {
      selectStand(null)
    }
  }

  const handleStageMouseMove = () => {
    const pos = getPointerPosition()
    if (!pos) return

    if (rectStart && rectDraft && draftContext?.tool === 'rect') {
      const nextRect = buildRectDraft(
        rectStart,
        pos,
        color,
        draftContext.subject === 'stand' ? rectPreset : null,
      )
      setRectDraft({ ...rectDraft, ...nextRect })
      return
    }
  }

  const handleStageMouseUp = () => {
    if (draftContext?.tool === 'rect' && rectDraft) {
      if (rectDraft.width >= MIN_SHAPE_SIZE && rectDraft.height >= MIN_SHAPE_SIZE) {
        commitShape(
          {
            ...rectDraft,
            id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          },
          draftContext.subject,
        )
      } else {
        resetDrafts()
      }
    }
  }

  const handleStandDragEnd = (
    e: KonvaEventObject<DragEvent>,
    stand: Stand,
  ) => {
    const newX = e.target.x()
    const newY = e.target.y()

    // Check if inside any zone
    let newZoneId = undefined;
    let newFullPrice = stand.price; // Start with current price

    const zone = zones.find(z => {
      // Check if stand center is inside zone
      const centerX = newX + stand.width / 2;
      const centerY = newY + stand.height / 2;
      return (
        centerX >= z.x &&
        centerX <= z.x + z.width &&
        centerY >= z.y &&
        centerY <= z.y + z.height
      );
    });

    if (zone) {
      newZoneId = zone.id;
      // Inherit price from zone if available
      if (zone.price && zone.price > 0) {
        newFullPrice = zone.price;
      }
    }

    updateStand(stand.id, {
      x: newX,
      y: newY,
      zone_id: newZoneId,
      price: newFullPrice
    })
  }

  const handleZoneDragEnd = (
    e: KonvaEventObject<DragEvent>,
    zone: Zone
  ) => {
    const newX = e.target.x()
    const newY = e.target.y()

    // Update zone with new position
    updateZone(zone.id, { x: newX, y: newY })

    // Disassociate stands that were in this zone but are now outside
    const newZoneBounds = { x: newX, y: newY, width: zone.width, height: zone.height }
    stands.forEach(stand => {
      if (stand.zone_id === zone.id) {
        // Check if stand center is still inside the zone
        const standCenterX = stand.x + stand.width / 2
        const standCenterY = stand.y + stand.height / 2
        const isStillInside =
          standCenterX >= newZoneBounds.x &&
          standCenterX <= newZoneBounds.x + newZoneBounds.width &&
          standCenterY >= newZoneBounds.y &&
          standCenterY <= newZoneBounds.y + newZoneBounds.height

        if (!isStillInside) {
          // Disassociate the stand from this zone
          updateStand(stand.id, { zone_id: undefined })
        }
      }
    })
  }

  const handleShapeClick = (
    event: KonvaEventObject<MouseEvent>,
    shape: Stand | Zone,
    subject: Subject,
  ) => {
    event.cancelBubble = true


    // Select stands or zones depending on subject
    if (subject === 'stand') {
      selectStand(shape.id)
    } else if (subject === 'zone') {
      selectZone(shape.id)
    }
  }

  const canDragStand = modeMeta.subject === 'stand' && modeMeta.tool === 'select'
  const canDragZone = modeMeta.subject === 'zone' && modeMeta.tool === 'select'

  // Colores según estado de reserva
  const getStandFillColor = (stand: Stand): string => {
    switch (stand.reservationStatus) {
      case 'PENDING':
        return '#fbbf24' // Amarillo-naranja
      case 'RESERVED':
        return '#ef4444' // Rojo
      case 'BLOCKED':
        return '#9ca3af' // Gris
      case 'AVAILABLE':
      default:
        return '#22c55e' // Verde
    }
  }

  const renderShape = (shape: Stand | Zone, subject: Subject) => {
    const isSelected = subject === 'stand' && shape.id === selectedStandId
    const stroke =
      subject === 'stand' ? (isSelected ? '#1d3557' : '#64748b') : '#475569'
    const strokeWidth = isSelected ? 3 : 1.25
    const opacity = subject === 'zone' ? 0.45 : 1
    const isStand = subject === 'stand'
    const fillColor = isStand ? getStandFillColor(shape as Stand) : shape.color

    const dragProps =
      isStand && canDragStand
        ? {
          draggable: true,
          onDragStart: () => selectStand(shape.id),
          onDragEnd: (event: KonvaEventObject<DragEvent>) =>
            handleStandDragEnd(event, shape as Stand),
        }
        : isStand
          ? { draggable: false } // No drag if not select mode
          : canDragZone
            ? {
              draggable: true,
              onDragStart: () => selectZone(shape.id),
              onDragEnd: (event: KonvaEventObject<DragEvent>) =>
                handleZoneDragEnd(event, shape as Zone),
            }
            : {}

    let shapeNode: ReactNode

    if (shape.kind === 'rect') {
      shapeNode = (
        <Rect
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          fill={fillColor}
          opacity={opacity}
          stroke={stroke}
          strokeWidth={strokeWidth}
          listening
        />
      )
    }

    if (isStand) {
      return (
        <Group
          key={`stand-${shape.id}`}
          onClick={(event) => handleShapeClick(event, shape, subject)}
          {...dragProps}
        >
          {shapeNode}
          {shape.label ? renderStandLabel(shape as Stand) : null}
        </Group>
      )
    }

    return (
      <Group key={`zone-${shape.id}`} onClick={(event) => handleShapeClick(event, shape, subject)} {...dragProps}>
        {shapeNode}
      </Group>
    )
  }

  const stageCursor = useMemo(() => {
    switch (modeMeta.tool) {
      case 'rect':
        return 'crosshair'
      default:
        return 'default'
    }
  }, [modeMeta.tool])

  return (
    <div
      ref={containerRef}
      className="canvas-shell"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <Stage
        ref={stageRef}
        width={displayWidth}
        height={displayHeight}
        scaleX={scale}
        scaleY={scale}
        x={stagePosition.x}
        y={stagePosition.y}
        className="canvas-stage"
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onContextMenu={(e) => e.evt.preventDefault()}
        style={{ cursor: stageCursor }}
      >
        <Layer>
          {backgroundImage && (
            <KonvaImage image={backgroundImage} listening={false} />
          )}
          {/* Grid lines */}
          {scale >= 1 && (
            <>
              {/* Vertical lines */}
              {Array.from({ length: Math.ceil(canvasWidth / gridSize) + 1 }, (_, i) => (
                <Line
                  key={`v-${i}`}
                  points={[i * gridSize, 0, i * gridSize, canvasHeight]}
                  stroke="#94a3b8"
                  strokeWidth={0.5}
                  opacity={0.5}
                  listening={false}
                />
              ))}
              {/* Horizontal lines */}
              {Array.from({ length: Math.ceil(canvasHeight / gridSize) + 1 }, (_, i) => (
                <Line
                  key={`h-${i}`}
                  points={[0, i * gridSize, canvasWidth, i * gridSize]}
                  stroke="#94a3b8"
                  strokeWidth={0.5}
                  opacity={0.5}
                  listening={false}
                />
              ))}
            </>
          )}
        </Layer>

        <Layer>
          {zones.map((zone) => renderShape(zone, 'zone'))}
        </Layer>

        <Layer>
          {stands.map((stand) => renderShape(stand, 'stand'))}
          {rectDraft && (
            <Rect
              x={rectDraft.x}
              y={rectDraft.y}
              width={rectDraft.width}
              height={rectDraft.height}
              stroke="#118ab2"
              dash={[8, 4]}
              strokeWidth={2}
              listening={false}
            />
          )}

        </Layer>
      </Stage>

      <CanvasControls
        scale={scale}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={resetView}
        onFitToScreen={fitToScreen}
        minScale={MIN_SCALE}
        maxScale={MAX_SCALE}
        showPanHint={true}
      />

      <ShapeCreationModal
        isOpen={pendingShape !== null}
        type={pendingShape?.subject === 'zone' ? 'zone' : 'stand'}
        defaultName={pendingShape?.shape.label || ''}
        defaultColor={pendingShape?.shape.color || color}
        defaultPrice={pendingShape?.shape.price}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
      />
    </div>
  )
}

export default StandCanvas
