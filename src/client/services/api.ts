/**
 * Servicios API para la aplicación cliente.
 * Las peticiones de lectura son públicas, las de escritura requieren autenticación.
 */

import { api } from '../../auth/apiClient';

export interface PlanoData {
    id: string;
    name: string;
    url: string;
    width: number;
    height: number;
    pixels_per_meter?: number;
    evento_id?: string;
    spaces: SpaceData[];
    zones: ZoneData[];
}

/**
 * Converts pixel dimensions to meters using the plano's scale.
 * If no scale is set, returns null.
 */
export function pixelsToMeters(pixels: number, pixelsPerMeter?: number): number | null {
    if (!pixelsPerMeter || pixelsPerMeter <= 0) return null;
    return pixels / pixelsPerMeter;
}

/**
 * Formats dimensions (width x height) to meters string.
 * Returns pixels if no scale is available.
 */
export function formatDimensions(width: number, height: number, pixelsPerMeter?: number): string {
    if (pixelsPerMeter && pixelsPerMeter > 0) {
        const widthM = (width / pixelsPerMeter).toFixed(1);
        const heightM = (height / pixelsPerMeter).toFixed(1);
        return `${widthM} x ${heightM} m`;
    }
    // No scale - show in pixels
    return `${Math.round(width)} x ${Math.round(height)} px`;
}

export interface SpaceData {
    id: string;
    kind: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    rotation?: number;
    name: string;
    active: boolean;
    price?: number;
    zone_id?: string;
    reservations?: ReservationData[];
}

export interface ZoneData {
    id: string;
    kind: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    rotation?: number;
    name: string;
    description?: string;
    price?: number;
}

export interface ReservationData {
    id: string;
    estado: string;
    asignee?: string;
    user_id?: string;
    expires_at?: string;
    client_profile?: {
        company: string | null;
        linkedin: string | null;
        email: string | null;
    };
}

export interface EventoData {
    id: string;
    nombre: string;
    fecha_reserva_desde: string;
    fecha_reserva_hasta: string;
    planos?: PlanoData[];
}

// ==================== PLANOS API (Públicos) ====================

export async function fetchPlanos(): Promise<PlanoData[]> {
    return api.get<PlanoData[]>('/planos/', { skipAuth: true });
}

export async function fetchPlano(id: string): Promise<PlanoData> {
    return api.get<PlanoData>(`/planos/${id}`, { skipAuth: true });
}

// ==================== EVENTOS API (Públicos) ====================

export async function fetchEventos(): Promise<EventoData[]> {
    // Solo eventos visibles para clientes
    return api.get<EventoData[]>('/eventos/?visible_only=true', { skipAuth: true });
}

// ==================== RESERVACIONES API (Requieren Auth) ====================

export async function createReservation(spaceId: string, asignee?: string): Promise<ReservationData> {
    return api.post<ReservationData>(`/spaces/${spaceId}/reservar`, { asignee });
}

export async function cancelReservation(spaceId: string): Promise<void> {
    await api.delete(`/spaces/${spaceId}/reserva`);
}

// ==================== MIS RESERVAS ====================

export interface MyReservationData {
    id: string;
    estado: string;
    asignee?: string;
    user_id?: string;
    space_id: string;
    space_name?: string;
    expires_at?: string;
    created_at?: string;
    updated_at?: string;
}

export async function fetchMyReservations(): Promise<MyReservationData[]> {
    const response = await api.get<{ status: string; reservations: MyReservationData[] }>('/api/reservas/mis-reservas');
    return response.reservations;
}

export async function requestCancellation(reservationId: string): Promise<MyReservationData> {
    const response = await api.post<{ status: string; message: string; reservation: MyReservationData }>(
        `/api/reservas/${reservationId}/solicitar-cancelacion`
    );
    return response.reservation;
}

// ==================== BLOQUEO DE ESPACIOS (Requieren Auth + Admin) ====================

export async function blockSpace(spaceId: string): Promise<SpaceData> {
    return api.patch<SpaceData>(`/spaces/${spaceId}/bloquear`);
}

export async function unblockSpace(spaceId: string): Promise<SpaceData> {
    return api.patch<SpaceData>(`/spaces/${spaceId}/desbloquear`);
}

// ==================== USER PROFILE API ====================

export interface UserProfileData {
    id?: string;
    user_id?: string;
    email: string | null;
    phone: string | null;
    linkedin: string | null;
    company: string | null;
    position: string | null;
    notes: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface ProfileResponse {
    status: string;
    profile: UserProfileData;
    is_complete: boolean;
}

export async function fetchUserProfile(): Promise<ProfileResponse> {
    return api.get<ProfileResponse>('/api/user-profiles/me');
}

export async function updateUserProfile(data: Partial<UserProfileData>): Promise<ProfileResponse> {
    return api.put<ProfileResponse>('/api/user-profiles/me', data);
}

export async function checkProfileComplete(): Promise<{ is_complete: boolean; missing_fields: string[] }> {
    return api.get<{ status: string; is_complete: boolean; missing_fields: string[] }>('/api/user-profiles/me/complete');
}
