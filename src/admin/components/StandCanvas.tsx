import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import Konva from 'konva'
import { Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text } from 'react-konva'
import { toProxyUrl } from '../../utils/imageProxy'
import type { KonvaEventObject } from 'konva/lib/Node'
import type {
  DrawingMode,
  RectShape,
  Stand,
  Zone,
} from '../store/standStore'
import { useStandStore } from '../store/standStore'
import CanvasControls from '../../components/CanvasControls'
import ShapeCreationModal from './ShapeCreationModal'
import ScaleCalibrationModal from './ScaleCalibrationModal'
import { Circle } from 'react-konva'
import { useIsMobile } from '../../hooks/useIsMobile'

type Subject = 'stand' | 'zone'
type ToolAction = 'select' | 'rect'
type DraftTool = 'rect'
type DraftContext = { subject: Subject; tool: DraftTool } | null

type StandCanvasProps = {
  backgroundSrc?: string
}

const MIN_SHAPE_SIZE = 8

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
  const selectStand = useStandStore((state) => state.selectStand)
  const selectZone = useStandStore((state) => state.selectZone)
  const updateStand = useStandStore((state) => state.updateStand)
  const updateZone = useStandStore((state) => state.updateZone)
  const setCanvasSize = useStandStore((state) => state.setCanvasSize)
  const canvasWidth = useStandStore((state) => state.canvasWidth)
  const canvasHeight = useStandStore((state) => state.canvasHeight)
  const getNextStandNumber = useStandStore((state) => state.getNextStandNumber)
  const checkOverlap = useStandStore((state) => state.checkOverlap)
  const getNextZoneNumber = useStandStore((state) => state.getNextZoneNumber)
  const checkZoneOverlap = useStandStore((state) => state.checkZoneOverlap)
  const showGrid = useStandStore((state) => state.showGrid)
  const snapPosition = useStandStore((state) => state.snapPosition)
  const savePlano = useStandStore((state) => state.savePlano)

  // Subscribe to grid-related state to trigger re-renders when they change
  const gridSize = useStandStore((state) => state.gridSize)
  const gridUnit = useStandStore((state) => state.gridUnit)
  const gridOffsetX = useStandStore((state) => state.gridOffsetX)
  const gridOffsetY = useStandStore((state) => state.gridOffsetY)
  const pixelsPerMeter = useStandStore((state) => state.pixelsPerMeter)

  // Compute grid size in pixels reactively
  const gridSizePixels = useMemo(() => {
    if (gridUnit === 'meters' && pixelsPerMeter > 0) {
      return gridSize * pixelsPerMeter
    }
    return gridSize
  }, [gridSize, gridUnit, pixelsPerMeter])

  // Size mode
  const sizeMode = useStandStore((state) => state.sizeMode)
  const getMeasuredSizeInPixels = useStandStore((state) => state.getMeasuredSizeInPixels)

  // Compute measured size in pixels
  const measuredSizeInPixels = useMemo(() => {
    if (sizeMode !== 'measured') return null
    return getMeasuredSizeInPixels()
  }, [sizeMode, getMeasuredSizeInPixels])

  // Calibration state
  const showCalibrationModal = useStandStore((state) => state.showCalibrationModal)
  const setShowCalibrationModal = useStandStore((state) => state.setShowCalibrationModal)
  const calibrationPoints = useStandStore((state) => state.calibrationPoints)
  const addCalibrationPoint = useStandStore((state) => state.addCalibrationPoint)
  const isCalibrating = useStandStore((state) => state.isCalibrating)

  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null)
  const [rectDraft, setRectDraft] = useState<RectShape | null>(null)
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(null)
  const [draftContext, setDraftContext] = useState<DraftContext>(null)

  // Pending shape for modal confirmation
  const [pendingShape, setPendingShape] = useState<{ shape: Stand | Zone; subject: Subject } | null>(null)

  // Container size tracking for auto-fit
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })

  // Zoom state
  const [scale, setScale] = useState(1)
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [isSpacePressed, setIsSpacePressed] = useState(false)

  const MIN_SCALE = 0.1
  const MAX_SCALE = 5
  const SCALE_STEP = 0.15

  // Detectar si es móvil - deshabilitar creación de stands
  const isMobile = useIsMobile(768)

  // En móvil, forzar modo selección (no se puede crear)
  const effectiveMode: DrawingMode = isMobile ? 'select' : mode
  const modeMeta = useMemo(() => parseMode(effectiveMode), [effectiveMode])

  // Track container size
  useEffect(() => {
    const updateContainerSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setContainerSize({ width: rect.width, height: rect.height })
      }
    }

    updateContainerSize()
    window.addEventListener('resize', updateContainerSize)

    // Also observe container itself
    const resizeObserver = new ResizeObserver(updateContainerSize)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      window.removeEventListener('resize', updateContainerSize)
      resizeObserver.disconnect()
    }
  }, [])

  // Calculate fit scale
  const fitScale = useMemo(() => {
    if (!canvasWidth || !canvasHeight) return 1
    const scaleX = containerSize.width / canvasWidth
    const scaleY = containerSize.height / canvasHeight
    return Math.min(scaleX, scaleY, 1)
  }, [containerSize.width, containerSize.height, canvasWidth, canvasHeight])

  // Auto-fit when canvas size changes
  useEffect(() => {
    if (canvasWidth && canvasHeight) {
      setScale(fitScale)
      // Center the canvas
      const centeredX = (containerSize.width - canvasWidth * fitScale) / 2
      const centeredY = (containerSize.height - canvasHeight * fitScale) / 2
      setStagePosition({ x: Math.max(0, centeredX), y: Math.max(0, centeredY) })
    }
  }, [canvasWidth, canvasHeight, fitScale, containerSize])

  // Zoom functions
  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(MAX_SCALE, prev * (1 + SCALE_STEP)))
  }, [])

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(MIN_SCALE, prev * (1 - SCALE_STEP)))
  }, [])

  const resetView = useCallback(() => {
    setScale(1)
    setStagePosition({ x: 0, y: 0 })
  }, [])

  const fitToScreen = useCallback(() => {
    setScale(fitScale)
    const centeredX = (containerSize.width - canvasWidth * fitScale) / 2
    const centeredY = (containerSize.height - canvasHeight * fitScale) / 2
    setStagePosition({ x: Math.max(0, centeredX), y: Math.max(0, centeredY) })
  }, [fitScale, containerSize, canvasWidth, canvasHeight])

  // Handle wheel zoom (deshabilitado en móvil)
  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    // En móvil el plano está fijo
    if (isMobile) return

    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return

    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const oldScale = scale
    const mousePointTo = {
      x: (pointer.x - stagePosition.x) / oldScale,
      y: (pointer.y - stagePosition.y) / oldScale,
    }

    const direction = e.evt.deltaY > 0 ? -1 : 1
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, oldScale * (1 + direction * SCALE_STEP)))

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    }

    setScale(newScale)
    setStagePosition(newPos)
  }, [scale, stagePosition])

  // Space key for panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpacePressed) {
        setIsSpacePressed(true)
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false)
        setIsPanning(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isSpacePressed])

  // Display dimensions (scaled)
  const displayWidth = containerSize.width
  const displayHeight = containerSize.height

  useEffect(() => {
    if (!backgroundSrc) {
      setBackgroundImage(null)
      return
    }

    // Convertir URL de S3 a URL del proxy para evitar CORS
    const imageUrl = toProxyUrl(backgroundSrc)

    const loadImage = () => {
      const image = new window.Image()
      image.crossOrigin = 'anonymous'

      image.onload = () => {
        const imgWidth = image.naturalWidth || image.width
        const imgHeight = image.naturalHeight || image.height

        if (imgWidth > 0 && imgHeight > 0) {
          setCanvasSize(imgWidth, imgHeight)
        } else {
          console.warn('Imagen sin dimensiones validas')
        }
        setBackgroundImage(image)
      }

      image.onerror = () => {
        console.error('Error loading background image:', imageUrl)
        setBackgroundImage(null)
      }

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

  useEffect(() => {
    resetDrafts()
  }, [mode])

  const getPointerPosition = () => {
    const stage = stageRef.current
    const pointer = stage?.getPointerPosition()
    if (!pointer) return null
    // Adjust for scale and position
    const rawPos = {
      x: (pointer.x - stagePosition.x) / scale,
      y: (pointer.y - stagePosition.y) / scale,
    }
    // Apply snap to grid if enabled
    return snapPosition(rawPos.x, rawPos.y)
  }

  const commitShape = (shape: Stand | Zone, subject: Subject) => {
    if (subject === 'stand') {
      const stand = shape as Stand

      // Check for overlap with existing stands (only for rect shapes)
      if (stand.kind === 'rect') {
        const overlappingStand = checkOverlap({ x: stand.x, y: stand.y, width: stand.width, height: stand.height })
        if (overlappingStand) {
          alert(`¡No se puede crear el stand! Se superpone con "${overlappingStand.label || 'otro stand'}"`)
          resetDrafts()
          return
        }
      }

      // Auto-assign label "Stand nuevo X"
      const nextNum = getNextStandNumber()
      let standWithLabel = { ...stand, label: `Stand nuevo ${nextNum}` }

      // Check if inside a zone to inherit price
      if (stand.kind === 'rect') {
        const standCenterX = stand.x + stand.width / 2
        const standCenterY = stand.y + stand.height / 2

        for (const zone of zones) {
          if (zone.kind === 'rect') {
            const isInside =
              standCenterX >= zone.x &&
              standCenterX <= zone.x + zone.width &&
              standCenterY >= zone.y &&
              standCenterY <= zone.y + zone.height

            if (isInside && zone.price != null) {
              standWithLabel = { ...standWithLabel, price: zone.price, zone_id: zone.id }
              break
            }
          }
        }
      }

      // Show modal for stand configuration
      setPendingShape({ shape: standWithLabel, subject: 'stand' })
    } else {
      const zone = shape as Zone

      // Check for overlap with existing zones (only for rect shapes)
      if (zone.kind === 'rect') {
        const overlappingZone = checkZoneOverlap({ x: zone.x, y: zone.y, width: zone.width, height: zone.height })
        if (overlappingZone) {
          alert(`¡No se puede crear la zona! Se superpone con "${overlappingZone.label || 'otra zona'}"`)
          resetDrafts()
          return
        }
      }

      // Auto-assign label "Zona nueva X"
      const nextZoneNum = getNextZoneNumber()
      const zoneWithLabel = { ...zone, label: `Zona nueva ${nextZoneNum}` }

      // Show modal for zone configuration
      setPendingShape({ shape: zoneWithLabel, subject: 'zone' })
    }
    resetDrafts()
  }

  // Simple toast notification helper
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

  // Handle modal confirmation
  const handleModalConfirm = async (data: { name: string; color: string; price?: number; description?: string }) => {
    if (!pendingShape) return

    const { shape, subject } = pendingShape

    if (subject === 'stand') {
      const finalStand = {
        ...shape,
        label: data.name,
        color: data.color,
        price: data.price,
      } as Stand
      addStand(finalStand)
      showToast(`✅ Stand "${data.name}" creado correctamente`)
    } else {
      const finalZone = {
        ...shape,
        label: data.name,
        color: data.color,
        price: data.price,
        description: data.description,
      } as Zone
      addZone(finalZone)
      showToast(`✅ Zona "${data.name}" creada correctamente`)
    }

    setPendingShape(null)

    // Auto-save to backend silently after creating stand or zone
    try {
      await savePlano({ silent: true })
    } catch (error) {
      console.error('Error auto-saving after shape creation:', error)
    }
  }

  // Handle modal cancel
  const handleModalCancel = () => {
    setPendingShape(null)
  }

  const handleStageMouseDown = (_event: KonvaEventObject<MouseEvent>) => {
    const pos = getPointerPosition()
    if (!pos) return

    // If calibrating, add calibration point instead of drawing
    if (isCalibrating && calibrationPoints.length < 2) {
      addCalibrationPoint(pos)
      return
    }

    if (modeMeta.tool === 'rect') {
      setDraftContext({ subject: modeMeta.subject, tool: 'rect' })
      setRectStart(pos)
      setRectDraft({
        id: 'draft',
        kind: 'rect',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        color,
      })
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
        draftContext.subject === 'stand' ? measuredSizeInPixels : null,
      )
      setRectDraft({ ...rectDraft, ...nextRect })
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

  const handleStandDragEnd = async (
    event: KonvaEventObject<DragEvent>,
    shape: Stand,
  ) => {
    const node = event.target
    // The node position is now absolute (centerX, centerY after drag)
    const newCenterX = node.x()
    const newCenterY = node.y()

    // Calculate the original center
    const originalCenterX = shape.x + shape.width / 2
    const originalCenterY = shape.y + shape.height / 2

    // Calculate delta from original center
    const deltaX = newCenterX - originalCenterX
    const deltaY = newCenterY - originalCenterY

    if (deltaX === 0 && deltaY === 0) {
      return
    }

    // Calculate new top-left position with snap
    const rawX = shape.x + deltaX
    const rawY = shape.y + deltaY
    const snapped = snapPosition(rawX, rawY)
    const newX = snapped.x
    const newY = snapped.y

    // Check for overlap with other stands at new position (exclude current stand)
    const overlappingStand = checkOverlap({ x: newX, y: newY, width: shape.width, height: shape.height }, shape.id)
    if (overlappingStand) {
      // Don't allow the move - position is already reset by node.position({ x: 0, y: 0 })
      alert(`¡No se puede mover el stand! Se superpone con "${overlappingStand.label || 'otro stand'}"`)
      return
    }

    // Calculate center of stand for zone detection
    const centerX = newX + shape.width / 2
    const centerY = newY + shape.height / 2

    // Find containing zone
    let newZoneId: string | undefined = undefined
    let newPrice: number | undefined = undefined
    for (const zone of zones) {
      if (zone.kind === 'rect') {
        const isInside =
          centerX >= zone.x &&
          centerX <= zone.x + zone.width &&
          centerY >= zone.y &&
          centerY <= zone.y + zone.height

        if (isInside) {
          newZoneId = zone.id
          // Inherit zone price if zone has one
          if (zone.price != null) {
            newPrice = zone.price
          }
          break
        }
      }
    }

    // Update stand with new position, zone_id, and inherited price
    const updates: Partial<Stand> = { x: newX, y: newY, zone_id: newZoneId }
    if (newPrice !== undefined) {
      updates.price = newPrice
    }
    updateStand(shape.id, updates)

    // Auto-save to backend silently
    try {
      await savePlano({ silent: true })
      showToast(`✅ Stand "${shape.label || 'Stand'}" movido correctamente`)
    } catch (error) {
      console.error('Error auto-saving after stand drag:', error)
    }
  }

  const handleZoneDragEnd = async (
    event: KonvaEventObject<DragEvent>,
    zone: Zone,
  ) => {
    const node = event.target
    // The node position is now absolute (centerX, centerY after drag)
    const newCenterX = node.x()
    const newCenterY = node.y()

    // Calculate the original center
    const originalCenterX = zone.x + zone.width / 2
    const originalCenterY = zone.y + zone.height / 2

    // Calculate delta from original center
    const deltaX = newCenterX - originalCenterX
    const deltaY = newCenterY - originalCenterY

    if (deltaX === 0 && deltaY === 0) {
      return
    }

    // Calculate new top-left position with snap
    const rawX = zone.x + deltaX
    const rawY = zone.y + deltaY
    const snapped = snapPosition(rawX, rawY)
    const newX = snapped.x
    const newY = snapped.y

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

    // Auto-save to backend silently
    try {
      await savePlano({ silent: true })
      showToast(`✅ Zona "${zone.label || 'Zona'}" movida correctamente`)
    } catch (error) {
      console.error('Error auto-saving after zone drag:', error)
    }
  }

  const handleShapeClick = (
    _event: KonvaEventObject<MouseEvent>,
    shape: Stand | Zone,
    subject: Subject,
  ) => {
    // Select stands or zones depending on subject
    if (subject === 'stand') {
      selectStand(shape.id)
    } else if (subject === 'zone') {
      selectZone(shape.id)
    }
  }

  // En móvil no se permite drag (solo visualización y selección)
  // Allow dragging stands in select mode or stand-select mode
  const canDragStand = !isMobile && modeMeta.tool === 'select' && (modeMeta.subject === 'stand' || mode === 'select')
  // Allow dragging zones in select mode or zone-select mode
  const canDragZone = !isMobile && modeMeta.tool === 'select' && (modeMeta.subject === 'zone' || mode === 'select')

  // Colores según estado de reserva
  const getStandFillColor = (stand: Stand): string => {
    switch (stand.reservationStatus) {
      case 'PENDING':
      case 'CANCELLATION_REQUESTED':
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
    const rotation = shape.rotation || 0

    // Calculate center for rotation pivot
    const centerX = shape.x + shape.width / 2
    const centerY = shape.y + shape.height / 2

    const dragProps =
      isStand && canDragStand
        ? {
          draggable: true,
          onDragStart: () => selectStand(shape.id),
          onDragEnd: (event: KonvaEventObject<DragEvent>) =>
            handleStandDragEnd(event, shape as Stand),
        }
        : !isStand && canDragZone
          ? {
            draggable: true,
            onDragStart: () => selectZone(shape.id),
            onDragEnd: (event: KonvaEventObject<DragEvent>) =>
              handleZoneDragEnd(event, shape as Zone),
          }
          : {}

    // Rect positioned at origin (offset will handle position)
    const shapeNode = (
      <Rect
        x={-shape.width / 2}
        y={-shape.height / 2}
        width={shape.width}
        height={shape.height}
        fill={fillColor}
        opacity={opacity}
        stroke={stroke}
        strokeWidth={strokeWidth}
        listening
      />
    )

    // Rotation handle - circle at top center of stand
    const rotationHandle = isSelected && canDragStand ? (
      <Circle
        x={0}
        y={-shape.height / 2 - 25}
        radius={10}
        fill="#3b82f6"
        stroke="white"
        strokeWidth={2}
        draggable
        onClick={(e) => {
          e.cancelBubble = true
        }}
        onMouseDown={(e) => {
          e.cancelBubble = true
        }}
        onDragStart={(e) => {
          e.cancelBubble = true
        }}
        onDragMove={(e) => {
          e.cancelBubble = true
          const stage = e.target.getStage()
          if (!stage) return

          // Get pointer position relative to the stage
          const pointer = stage.getPointerPosition()
          if (!pointer) return

          // Calculate center of shape in stage coordinates
          const centerX = shape.x + shape.width / 2
          const centerY = shape.y + shape.height / 2

          // Get mouse position relative to center, accounting for scale and stage position
          const dx = (pointer.x - stagePosition.x) / scale - centerX
          const dy = (pointer.y - stagePosition.y) / scale - centerY

          // Calculate angle (0 = up, clockwise positive)
          const angle = Math.atan2(dx, -dy) * (180 / Math.PI)

          updateStand(shape.id, { rotation: angle })

          // Keep handle at fixed position relative to rotated group (it will rotate with parent)
          e.target.position({ x: 0, y: -shape.height / 2 - 25 })
        }}
        onDragEnd={async (e) => {
          e.cancelBubble = true
          try {
            await savePlano({ silent: true })
            showToast(`✅ Stand "${(shape as Stand).label || 'Stand'}" rotado`)
          } catch (error) {
            console.error('Error saving rotation:', error)
          }
        }}
        cursor="grab"
      />
    ) : null

    // Line connecting handle to rect (only when selected)
    const rotationLine = isSelected && canDragStand ? (
      <Line
        points={[0, -shape.height / 2, 0, -shape.height / 2 - 15]}
        stroke="#3b82f6"
        strokeWidth={2}
        listening={false}
      />
    ) : null

    if (isStand) {
      return (
        <Group
          key={`stand-${shape.id}`}
          x={centerX}
          y={centerY}
          rotation={rotation}
          onClick={(event) => handleShapeClick(event, shape, subject)}
          {...dragProps}
        >
          {shapeNode}
          {shape.label ? (
            <Text
              x={-shape.width / 2}
              y={-LABEL_FONT_SIZE / 2}
              width={shape.width}
              text={shape.label}
              fontSize={LABEL_FONT_SIZE}
              fontStyle="600"
              fill="#0f172a"
              align="center"
              listening={false}
            />
          ) : null}
          {rotationLine}
          {rotationHandle}
        </Group>
      )
    }

    return (
      <Group
        key={`zone-${shape.id}`}
        x={centerX}
        y={centerY}
        rotation={rotation}
        onClick={(event) => handleShapeClick(event, shape, subject)}
        {...dragProps}
      >
        <Rect
          x={-shape.width / 2}
          y={-shape.height / 2}
          width={shape.width}
          height={shape.height}
          fill={shape.color}
          opacity={opacity}
          stroke={stroke}
          strokeWidth={strokeWidth}
          listening
        />
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
        onMouseDown={(e) => {
          // En móvil no hay panning
          if (!isMobile && isSpacePressed) {
            setIsPanning(true)
          } else if (!isMobile) {
            handleStageMouseDown(e)
          }
        }}
        onMouseMove={(e) => {
          // En móvil no hay panning ni dibujo
          if (isMobile) return

          if (isPanning) {
            const stage = stageRef.current
            if (stage) {
              const pos = stage.getPointerPosition()
              if (pos) {
                // Get movement delta
                const dx = e.evt.movementX
                const dy = e.evt.movementY
                setStagePosition(prev => ({
                  x: prev.x + dx,
                  y: prev.y + dy,
                }))
              }
            }
          } else {
            handleStageMouseMove()
          }
        }}
        onMouseUp={() => {
          // En móvil no hay acciones
          if (isMobile) return

          if (isPanning) {
            setIsPanning(false)
          } else {
            handleStageMouseUp()
          }
        }}
        style={{ cursor: isMobile ? 'default' : (isSpacePressed ? (isPanning ? 'grabbing' : 'grab') : stageCursor) }}
      >
        <Layer listening={false}>
          {backgroundImage ? (
            <KonvaImage
              image={backgroundImage}
              width={canvasWidth}
              height={canvasHeight}
              listening={false}
            />
          ) : (
            <Rect
              x={0}
              y={0}
              width={canvasWidth}
              height={canvasHeight}
              fill="#f1f3f5"
              listening={false}
            />
          )}

          {/* Grid Overlay */}
          {showGrid && (
            <>
              {/* Vertical lines - with offset */}
              {Array.from({ length: Math.ceil((canvasWidth + gridSizePixels) / gridSizePixels) + 1 }, (_, i) => {
                const x = (i * gridSizePixels) + (gridOffsetX % gridSizePixels)
                return (
                  <Line
                    key={`v-${i}`}
                    points={[x, 0, x, canvasHeight]}
                    stroke="#94a3b8"
                    strokeWidth={0.5}
                    opacity={0.5}
                    listening={false}
                  />
                )
              })}
              {/* Horizontal lines - with offset */}
              {Array.from({ length: Math.ceil((canvasHeight + gridSizePixels) / gridSizePixels) + 1 }, (_, i) => {
                const y = (i * gridSizePixels) + (gridOffsetY % gridSizePixels)
                return (
                  <Line
                    key={`h-${i}`}
                    points={[0, y, canvasWidth, y]}
                    stroke="#94a3b8"
                    strokeWidth={0.5}
                    opacity={0.5}
                    listening={false}
                  />
                )
              })}
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

          {/* Calibration point markers */}
          {calibrationPoints.map((point, index) => (
            <Circle
              key={`cal-${index}`}
              x={point.x}
              y={point.y}
              radius={8}
              fill={index === 0 ? '#ef4444' : '#22c55e'}
              stroke="white"
              strokeWidth={2}
              listening={false}
            />
          ))}
          {/* Line between calibration points */}
          {calibrationPoints.length === 2 && (
            <Line
              points={[
                calibrationPoints[0].x,
                calibrationPoints[0].y,
                calibrationPoints[1].x,
                calibrationPoints[1].y,
              ]}
              stroke="#3b82f6"
              strokeWidth={2}
              dash={[5, 5]}
              listening={false}
            />
          )}
        </Layer>
      </Stage>

      {/* Solo mostrar controles de zoom en desktop */}
      {!isMobile && (
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
      )}

      <ShapeCreationModal
        isOpen={pendingShape !== null}
        type={pendingShape?.subject === 'zone' ? 'zone' : 'stand'}
        defaultName={pendingShape?.shape.label || ''}
        defaultColor={pendingShape?.shape.color || color}
        defaultPrice={pendingShape?.shape.price}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
      />

      <ScaleCalibrationModal
        isOpen={showCalibrationModal}
        onClose={() => setShowCalibrationModal(false)}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
      />
    </div>
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
  measuredSize: { width: number; height: number } | null,
): Omit<RectShape, 'id'> => {
  // If measured size is provided, use fixed dimensions
  if (measuredSize) {
    const width = measuredSize.width
    const height = measuredSize.height
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

  // Free mode - user drags to define size
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

export default StandCanvas

const LABEL_FONT_SIZE = 13

