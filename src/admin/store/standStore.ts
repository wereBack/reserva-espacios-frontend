import { create } from 'zustand'
import { createPlano, updatePlano, fetchPlano, uploadPlanoImage, type PlanoData } from '../services/api'

export type DrawingMode =
  | 'select'
  | 'stand-rect'
  | 'stand-polygon'
  | 'stand-free'
  | 'stand-paint'
  | 'zone-rect'
  | 'zone-polygon'
  | 'zone-free'
  | 'zone-paint'
  | 'zone-select'

export type BaseShape = {
  id: string
  color: string
  label?: string
  description?: string
  price?: number
}

export type RectShape = BaseShape & {
  kind: 'rect'
  x: number
  y: number
  width: number
  height: number
}

export type PolygonShape = BaseShape & {
  kind: 'polygon'
  points: number[]
}

export type FreeShape = BaseShape & {
  kind: 'free'
  points: number[]
}

export type ReservationState = 'AVAILABLE' | 'PENDING' | 'RESERVED' | 'BLOCKED' | 'CANCELLATION_REQUESTED'

export type Stand = RectShape & {
  reservationStatus?: ReservationState
  zone_id?: string
}
export type Zone = RectShape

export type RectPreset = {
  id: string
  label: string
  width: number  // Always in meters
  height: number // Always in meters
}

export type SizeMode = 'free' | 'measured'
export type GridUnit = 'meters' | 'pixels'

type StandStore = {
  // Plano state
  planoId: string | null
  planoName: string
  eventoId: string | null
  backgroundUrl: string
  backgroundFile: File | null
  canvasWidth: number
  canvasHeight: number
  isSaving: boolean
  lastSaved: Date | null
  newlyCreatedPlanoId: string | null

  // Drawing state
  stands: Stand[]
  zones: Zone[]
  history: Array<{ type: 'stand' | 'zone'; id: string }>
  selectedStandId: string | null
  selectedZoneId: string | null
  mode: DrawingMode
  color: string
  rectPresetId: string | null
  presets: RectPreset[]

  // Drawing helpers
  snapToGrid: boolean
  gridSize: number
  gridUnit: GridUnit
  showGrid: boolean
  pixelsPerMeter: number
  planoWidthMeters: number | null
  planoHeightMeters: number | null
  scaleMode: 'auto' | 'manual'
  
  // Size mode
  sizeMode: SizeMode
  measuredWidth: number
  measuredHeight: number
  showMeasuredModal: boolean
  customPresets: RectPreset[]

  // Calibration
  showCalibrationModal: boolean
  calibrationPoints: Array<{ x: number; y: number }>
  isCalibrating: boolean

  // Plano actions
  setPlanoName: (name: string) => void
  setEventoId: (id: string | null) => void
  setBackgroundUrl: (url: string) => void
  setBackgroundFile: (file: File | null) => void
  setCanvasSize: (width: number, height: number) => void
  savePlano: (options?: { silent?: boolean }) => Promise<void>
  saveBackgroundImage: () => Promise<void>
  loadPlano: (id: string) => Promise<void>
  clearNewlyCreatedPlanoId: () => void
  isSavingImage: boolean

  // Drawing actions
  addStand: (stand: Stand) => void
  addZone: (zone: Zone) => void
  updateStand: (id: string, updates: Partial<Stand>) => void
  updateZone: (id: string, updates: Partial<Zone>) => void
  setMode: (mode: DrawingMode) => void
  setColor: (color: string) => void
  selectStand: (id: string | null) => void
  selectZone: (id: string | null) => void
  removeStand: (id: string) => void
  removeZone: (id: string) => void
  replaceStandId: (oldId: string, newId: string) => void
  replaceZoneId: (oldId: string, newId: string) => void
  clearAll: () => void
  undoLast: () => void
  setRectPreset: (id: string | null) => void
  getRectPreset: () => RectPreset | null

  // Validation helpers - Stands
  getNextStandNumber: () => number
  isNameDuplicate: (name: string, excludeId?: string) => boolean
  checkOverlap: (shape: { x: number; y: number; width: number; height: number }, excludeId?: string) => Stand | null

  // Validation helpers - Zones
  getNextZoneNumber: () => number
  isZoneNameDuplicate: (name: string, excludeId?: string) => boolean
  checkZoneOverlap: (shape: { x: number; y: number; width: number; height: number }, excludeId?: string) => Zone | null

  // Drawing helper actions
  setSnapToGrid: (enabled: boolean) => void
  setGridSize: (size: number) => void
  setGridUnit: (unit: GridUnit) => void
  setShowGrid: (show: boolean) => void
  setPixelsPerMeter: (ppm: number) => void
  setPlanoRealDimensions: (widthMeters: number | null, heightMeters: number | null) => void
  setScaleMode: (mode: 'auto' | 'manual') => void
  snapPosition: (x: number, y: number) => { x: number; y: number }
  getPresetInPixels: (preset: RectPreset) => { width: number; height: number }
  getGridSizeInPixels: () => number
  hasScale: () => boolean
  
  // Size mode actions
  setSizeMode: (mode: SizeMode) => void
  setMeasuredWidth: (width: number) => void
  setMeasuredHeight: (height: number) => void
  setShowMeasuredModal: (show: boolean) => void
  addCustomPreset: (preset: RectPreset) => void
  removeCustomPreset: (id: string) => void
  getMeasuredSizeInPixels: () => { width: number; height: number }

  // Calibration actions
  setShowCalibrationModal: (show: boolean) => void
  setCalibrationPoints: (points: Array<{ x: number; y: number }>) => void
  addCalibrationPoint: (point: { x: number; y: number }) => void
  setIsCalibrating: (calibrating: boolean) => void
}

// Helper to check if two rectangles overlap
const rectanglesOverlap = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean => {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  )
}

// Default presets defined in meters - pixel sizes calculated dynamically
const DEFAULT_PRESETS: RectPreset[] = [
  { id: 'small', label: '2 x 2 m', width: 2, height: 2 },
  { id: 'medium', label: '3 x 2 m', width: 3, height: 2 },
  { id: 'large', label: '4 x 3 m', width: 4, height: 3 },
]

// Load custom presets from localStorage
const loadCustomPresets = (): RectPreset[] => {
  try {
    const saved = localStorage.getItem('customPresets')
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

// Save custom presets to localStorage
const saveCustomPresets = (presets: RectPreset[]) => {
  try {
    localStorage.setItem('customPresets', JSON.stringify(presets))
  } catch {
    // Ignore localStorage errors
  }
}

// Helper to convert frontend shape to backend format
const shapeToApiFormat = (shape: Stand | Zone, index: number) => {
  return {
    kind: 'rect',
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
    color: shape.color,
    name: shape.label || `Stand ${index + 1}`,
    price: shape.price,
  }
}

// Helper to convert backend format to frontend shape
const apiToShapeFormat = (data: PlanoData['spaces'][0]): Stand => {
  // Determine reservation status
  let reservationStatus: ReservationState = 'AVAILABLE'

  if (data.active === false) {
    reservationStatus = 'BLOCKED'
  } else if (data.reservations && data.reservations.length > 0) {
    // Check for cancellation requests first
    const cancellationRequest = data.reservations.find(
      r => r.estado === 'CANCELLATION_REQUESTED'
    )
    if (cancellationRequest) {
      reservationStatus = 'CANCELLATION_REQUESTED'
    } else {
      // Check for active reservations
      const activeReservation = data.reservations.find(
        r => r.estado === 'RESERVED' || r.estado === 'PENDING'
      )
      if (activeReservation) {
        reservationStatus = activeReservation.estado === 'RESERVED' ? 'RESERVED' : 'PENDING'
      }
    }
  }

  return {
    id: data.id || `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    kind: 'rect',
    x: data.x,
    y: data.y,
    width: data.width,
    height: data.height,
    color: data.color,
    label: data.name,
    price: data.price,
    reservationStatus,
    zone_id: data.zone_id,
  }
}

// Helper to check if stand is inside a zone
const isInsideZone = (stand: { x: number; y: number; width: number; height: number }, zone: { x: number; y: number; width: number; height: number }): boolean => {
  // Check if stand center is inside zone
  const standCenterX = stand.x + stand.width / 2
  const standCenterY = stand.y + stand.height / 2
  return (
    standCenterX >= zone.x &&
    standCenterX <= zone.x + zone.width &&
    standCenterY >= zone.y &&
    standCenterY <= zone.y + zone.height
  )
}

// Helper to find containing zone for a stand
const findContainingZone = (stand: ReturnType<typeof shapeToApiFormat>, zones: ReturnType<typeof shapeToApiFormat>[]): string | undefined => {
  for (const zone of zones) {
    if (isInsideZone(stand, zone)) {
      return (zone as { id?: string }).id
    }
  }
  return undefined
}

export const useStandStore = create<StandStore>((set, get) => ({
  // Plano state
  planoId: null,
  planoName: 'Nuevo Plano',
  eventoId: null,
  backgroundUrl: '',
  backgroundFile: null,
  canvasWidth: 800,
  canvasHeight: 600,
  isSaving: false,
  isSavingImage: false,
  lastSaved: null,
  newlyCreatedPlanoId: null,

  // Drawing state
  stands: [],
  zones: [],
  history: [],
  selectedStandId: null,
  selectedZoneId: null,
  mode: 'stand-rect',
  color: '#ffb703',
  rectPresetId: 'medium',
  presets: DEFAULT_PRESETS,

  // Drawing helpers - initial values
  snapToGrid: false,
  gridSize: 1, // 1 meter by default when using meters
  gridUnit: 'meters' as GridUnit,
  showGrid: false,
  pixelsPerMeter: 0, // 0 means no scale calibrated
  planoWidthMeters: null,
  planoHeightMeters: null,
  scaleMode: 'manual' as const,
  
  // Size mode - initial values
  sizeMode: 'free' as SizeMode,
  measuredWidth: 3,
  measuredHeight: 2,
  showMeasuredModal: false,
  customPresets: loadCustomPresets(),

  // Calibration initial state
  showCalibrationModal: false,
  calibrationPoints: [],
  isCalibrating: false,

  // Plano actions
  setPlanoName: (name) => set({ planoName: name }),
  setEventoId: (id) => set({ eventoId: id }),
  setBackgroundUrl: (url) => set({ backgroundUrl: url }),
  setBackgroundFile: (file) => set({ backgroundFile: file }),
  setCanvasSize: (width, height) => set({ canvasWidth: width, canvasHeight: height }),
  clearNewlyCreatedPlanoId: () => set({ newlyCreatedPlanoId: null }),

  savePlano: async (options?: { silent?: boolean }) => {
    const state = get()
    set({ isSaving: true })

    try {
      let backgroundUrl = state.backgroundUrl

      // Si hay un archivo nuevo, subirlo primero a S3
      if (state.backgroundFile) {
        const uploadResult = await uploadPlanoImage(state.backgroundFile)
        backgroundUrl = uploadResult.url
        // Limpiar el archivo despues de subir y actualizar la URL
        set({ backgroundFile: null, backgroundUrl: backgroundUrl })
      }

      // First prepare zones with temporary IDs for reference
      const zonesWithIds = state.zones.map((zone, i) => ({
        ...shapeToApiFormat(zone, i),
        id: zone.id,
        name: zone.label || `Zona ${i + 1}`,
      }))

      // Prepare stands with zone detection
      const standsWithZones = state.stands.map((stand, i) => {
        const standData = shapeToApiFormat(stand, i)
        const containingZoneId = findContainingZone(standData, zonesWithIds)
        return {
          ...standData,
          id: stand.id, // Include local ID for matching
          zone_id: containingZoneId,
        }
      })

      const planoData: PlanoData = {
        name: state.planoName,
        url: backgroundUrl,
        width: state.canvasWidth,
        height: state.canvasHeight,
        evento_id: state.eventoId || undefined,
        pixels_per_meter: state.pixelsPerMeter > 0 ? state.pixelsPerMeter : undefined,
        spaces: standsWithZones,
        zones: zonesWithIds,
      }

      let result: PlanoData
      const isNewPlano = !state.planoId

      if (state.planoId) {
        result = await updatePlano(state.planoId, planoData)
      } else {
        result = await createPlano(planoData)
      }

      // Sync local IDs with backend UUIDs
      // The backend returns spaces and zones in the same order we sent them
      const updatedStands = state.stands.map((stand, index) => {
        const backendSpace = result.spaces?.[index]
        if (backendSpace?.id && stand.id !== backendSpace.id) {
          return { ...stand, id: backendSpace.id }
        }
        return stand
      })

      const updatedZones = state.zones.map((zone, index) => {
        const backendZone = result.zones?.[index]
        if (backendZone?.id && zone.id !== backendZone.id) {
          return { ...zone, id: backendZone.id }
        }
        return zone
      })

      set({
        planoId: result.id || null,
        isSaving: false,
        lastSaved: new Date(),
        stands: updatedStands,
        zones: updatedZones,
        // Solo setear si es un plano nuevo
        newlyCreatedPlanoId: isNewPlano ? (result.id || null) : null
      })

      // Solo mostrar alert si no es modo silencioso
      if (!options?.silent) {
        alert('Plano guardado correctamente')
      }
    } catch (error) {
      set({ isSaving: false })
      if (!options?.silent) {
        alert(`Error al guardar: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      }
      throw error // Re-throw para que el llamador pueda manejar el error
    }
  },

  saveBackgroundImage: async () => {
    const state = get()

    // Solo guardar si hay una imagen nueva y un plano existente
    if (!state.backgroundFile) {
      alert('No hay imagen nueva para guardar')
      return
    }

    if (!state.planoId) {
      alert('Primero debes guardar el área completa para poder guardar una imagen')
      return
    }

    set({ isSavingImage: true })

    try {
      // Subir la imagen a S3
      const uploadResult = await uploadPlanoImage(state.backgroundFile)
      const newBackgroundUrl = uploadResult.url

      // Actualizar solo la URL del plano
      const planoData: PlanoData = {
        name: state.planoName,
        url: newBackgroundUrl,
        width: state.canvasWidth,
        height: state.canvasHeight,
        evento_id: state.eventoId || undefined,
        spaces: state.stands.map((stand, i) => {
          const standData = {
            kind: 'rect',
            x: stand.kind === 'rect' ? stand.x : 0,
            y: stand.kind === 'rect' ? stand.y : 0,
            width: stand.kind === 'rect' ? stand.width : 0,
            height: stand.kind === 'rect' ? stand.height : 0,
            color: stand.color,
            name: stand.label || `Stand ${i + 1}`,
            price: stand.price,
          }
          return standData
        }),
        zones: state.zones.map((zone, i) => ({
          kind: 'rect',
          x: zone.kind === 'rect' ? zone.x : 0,
          y: zone.kind === 'rect' ? zone.y : 0,
          width: zone.kind === 'rect' ? zone.width : 0,
          height: zone.kind === 'rect' ? zone.height : 0,
          color: zone.color,
          name: zone.label || `Zona ${i + 1}`,
          id: zone.id,
        })),
      }

      await updatePlano(state.planoId, planoData)

      // Limpiar el archivo y actualizar la URL
      set({
        backgroundFile: null,
        backgroundUrl: newBackgroundUrl,
        isSavingImage: false,
        lastSaved: new Date()
      })

      alert('Imagen guardada correctamente')
    } catch (error) {
      set({ isSavingImage: false })
      alert(`Error al guardar la imagen: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  },

  loadPlano: async (id: string) => {
    try {
      const plano = await fetchPlano(id)

      const stands: Stand[] = (plano.spaces || []).map(apiToShapeFormat)
      const zones: Zone[] = (plano.zones || []).map(apiToShapeFormat)

      set({
        planoId: plano.id || null,
        planoName: plano.name,
        eventoId: plano.evento_id || null,
        backgroundUrl: plano.url,
        canvasWidth: plano.width,
        canvasHeight: plano.height,
        pixelsPerMeter: plano.pixels_per_meter || 0,
        stands,
        zones,
        history: [],
        selectedStandId: null,
      })
    } catch (error) {
      alert(`Error al cargar plano: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  },

  // Drawing actions
  addStand: (stand) =>
    set((state) => ({
      stands: [...state.stands, stand],
      history: [...state.history, { type: 'stand', id: stand.id }],
      selectedStandId: stand.id,
    })),
  addZone: (zone) =>
    set((state) => ({
      zones: [...state.zones, zone],
      history: [...state.history, { type: 'zone', id: zone.id }],
    })),
  updateStand: (id, updates) =>
    set((state) => ({
      stands: state.stands.map((stand) =>
        stand.id === id ? ({ ...stand, ...updates } as Stand) : stand,
      ),
    })),
  updateZone: (id, updates) =>
    set((state) => ({
      zones: state.zones.map((zone) =>
        zone.id === id ? ({ ...zone, ...updates } as Zone) : zone,
      ),
    })),
  setMode: (mode) => set({ mode }),
  setColor: (color) => set({ color }),
  selectStand: (id) => set({ selectedStandId: id }),
  selectZone: (id) => set({ selectedZoneId: id }),
  removeStand: (id) =>
    set((state) => ({
      stands: state.stands.filter((stand) => stand.id !== id),
      selectedStandId: state.selectedStandId === id ? null : state.selectedStandId,
    })),
  removeZone: (id) =>
    set((state) => ({
      zones: state.zones.filter((zone) => zone.id !== id),
    })),
  replaceStandId: (oldId, newId) =>
    set((state) => ({
      stands: state.stands.map((stand) =>
        stand.id === oldId ? { ...stand, id: newId } : stand
      ),
      selectedStandId: state.selectedStandId === oldId ? newId : state.selectedStandId,
      history: state.history.map((h) =>
        h.type === 'stand' && h.id === oldId ? { ...h, id: newId } : h
      ),
    })),
  replaceZoneId: (oldId, newId) =>
    set((state) => ({
      zones: state.zones.map((zone) =>
        zone.id === oldId ? { ...zone, id: newId } : zone
      ),
      history: state.history.map((h) =>
        h.type === 'zone' && h.id === oldId ? { ...h, id: newId } : h
      ),
    })),
  clearAll: () => set({
    stands: [],
    zones: [],
    history: [],
    selectedStandId: null,
    planoId: null,
    planoName: 'Nuevo Plano',
    backgroundUrl: '',
    backgroundFile: null,
  }),
  undoLast: () =>
    set((state) => {
      const history = [...state.history]
      const last = history.pop()
      if (!last) {
        return state
      }
      if (last.type === 'stand') {
        return {
          history,
          stands: state.stands.filter((stand) => stand.id !== last.id),
          selectedStandId:
            state.selectedStandId === last.id ? null : state.selectedStandId,
        }
      }
      return {
        history,
        zones: state.zones.filter((zone) => zone.id !== last.id),
      }
    }),
  setRectPreset: (id) => set({ rectPresetId: id }),
  getRectPreset: () =>
    get().presets.find((preset) => preset.id === get().rectPresetId) ?? null,

  // Validation helpers
  getNextStandNumber: () => {
    const stands = get().stands
    let maxNum = 0
    for (const stand of stands) {
      const match = stand.label?.match(/Stand nuevo (\d+)/)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNum) maxNum = num
      }
    }
    return maxNum + 1
  },

  isNameDuplicate: (name, excludeId) => {
    const stands = get().stands
    const trimmedName = name.trim().toLowerCase()
    return stands.some(
      (stand) => stand.id !== excludeId && stand.label?.trim().toLowerCase() === trimmedName
    )
  },

  checkOverlap: (shape, excludeId) => {
    const stands = get().stands
    for (const stand of stands) {
      if (stand.id === excludeId) continue
      if (stand.kind !== 'rect') continue // Only check rect vs rect for now

      const standRect = { x: stand.x, y: stand.y, width: stand.width, height: stand.height }
      if (rectanglesOverlap(shape, standRect)) {
        return stand
      }
    }
    return null
  },

  // Zone validation helpers
  getNextZoneNumber: () => {
    const zones = get().zones
    let maxNum = 0
    for (const zone of zones) {
      const match = zone.label?.match(/Zona nueva (\d+)/)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNum) maxNum = num
      }
    }
    return maxNum + 1
  },

  isZoneNameDuplicate: (name, excludeId) => {
    const zones = get().zones
    const trimmedName = name.trim().toLowerCase()
    return zones.some(
      (zone) => zone.id !== excludeId && zone.label?.trim().toLowerCase() === trimmedName
    )
  },

  checkZoneOverlap: (shape, excludeId) => {
    const zones = get().zones
    for (const zone of zones) {
      if (zone.id === excludeId) continue
      if (zone.kind !== 'rect') continue

      const zoneRect = { x: zone.x, y: zone.y, width: zone.width, height: zone.height }
      if (rectanglesOverlap(shape, zoneRect)) {
        return zone
      }
    }
    return null
  },

  // Drawing helper actions
  setSnapToGrid: (enabled) => set({ snapToGrid: enabled }),
  setGridSize: (size) => set({ gridSize: size }),
  setGridUnit: (unit) => set({ gridUnit: unit }),
  setShowGrid: (show) => set({ showGrid: show }),
  setPixelsPerMeter: (ppm) => set({ pixelsPerMeter: ppm }),

  getGridSizeInPixels: () => {
    const { gridSize, gridUnit, pixelsPerMeter } = get()
    if (gridUnit === 'meters' && pixelsPerMeter > 0) {
      return gridSize * pixelsPerMeter
    }
    return gridSize
  },
  
  hasScale: () => get().pixelsPerMeter > 0,

  snapPosition: (x, y) => {
    const { snapToGrid } = get()
    if (!snapToGrid) return { x, y }
    const gridSizePixels = get().getGridSizeInPixels()
    return {
      x: Math.round(x / gridSizePixels) * gridSizePixels,
      y: Math.round(y / gridSizePixels) * gridSizePixels,
    }
  },

  setPlanoRealDimensions: (widthMeters, heightMeters) => {
    const state = get()
    if (widthMeters && widthMeters > 0) {
      // Calculate pixels per meter based on canvas width and real width
      const ppm = state.canvasWidth / widthMeters
      set({
        planoWidthMeters: widthMeters,
        planoHeightMeters: heightMeters,
        pixelsPerMeter: ppm,
        scaleMode: 'auto',
      })
    } else {
      set({
        planoWidthMeters: null,
        planoHeightMeters: null,
        scaleMode: 'manual',
      })
    }
  },

  setScaleMode: (mode) => set({ scaleMode: mode }),

  getPresetInPixels: (preset) => {
    const { pixelsPerMeter } = get()
    return {
      width: preset.width * pixelsPerMeter,
      height: preset.height * pixelsPerMeter,
    }
  },

  // Calibration actions
  setShowCalibrationModal: (show) => set({ showCalibrationModal: show }),
  setCalibrationPoints: (points) => set({ calibrationPoints: points }),
  addCalibrationPoint: (point) => set((state) => {
    const newPoints = [...state.calibrationPoints, point]
    // Only keep last 2 points
    if (newPoints.length > 2) {
      return { calibrationPoints: newPoints.slice(-2) }
    }
    return { calibrationPoints: newPoints }
  }),
  setIsCalibrating: (calibrating) => set({ isCalibrating: calibrating }),
  
  // Size mode actions
  setSizeMode: (mode) => set({ sizeMode: mode }),
  setMeasuredWidth: (width) => set({ measuredWidth: width }),
  setMeasuredHeight: (height) => set({ measuredHeight: height }),
  setShowMeasuredModal: (show) => set({ showMeasuredModal: show }),
  
  addCustomPreset: (preset) => set((state) => {
    const newPresets = [...state.customPresets, preset]
    saveCustomPresets(newPresets)
    return { customPresets: newPresets }
  }),
  
  removeCustomPreset: (id) => set((state) => {
    const newPresets = state.customPresets.filter(p => p.id !== id)
    saveCustomPresets(newPresets)
    return { customPresets: newPresets }
  }),
  
  getMeasuredSizeInPixels: () => {
    const { measuredWidth, measuredHeight, pixelsPerMeter } = get()
    if (pixelsPerMeter > 0) {
      return {
        width: measuredWidth * pixelsPerMeter,
        height: measuredHeight * pixelsPerMeter,
      }
    }
    // If no scale, treat the values as pixels
    return {
      width: measuredWidth,
      height: measuredHeight,
    }
  },
}))
