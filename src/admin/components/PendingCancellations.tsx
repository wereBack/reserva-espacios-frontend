import { useState, useEffect, useCallback } from 'react'
import { io } from 'socket.io-client'
import {
    fetchCancellationRequests,
    approveCancellation,
    rejectCancellation,
    fetchUserProfileById,
    type ReservationData,
    type UserProfileData,
} from '../services/api'
import { useStandStore } from '../store/standStore'
import { useAuth } from '../../auth/AuthContext'
import keycloak from '../../auth/keycloak'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001'

const PendingCancellations = () => {
    const [reservations, setReservations] = useState<ReservationData[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [profileData, setProfileData] = useState<UserProfileData | null>(null)
    const [profileLoading, setProfileLoading] = useState(false)

    const { isAuthenticated, hasRole } = useAuth()
    const updateStand = useStandStore((state) => state.updateStand)

    // Cargar solicitudes de cancelación
    const loadReservations = useCallback(async () => {
        if (!isAuthenticated || !hasRole('Admin')) {
            setLoading(false)
            return
        }

        try {
            setError(null)
            const pending = await fetchCancellationRequests()
            setReservations(pending)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar cancelaciones')
        } finally {
            setLoading(false)
        }
    }, [isAuthenticated, hasRole])

    // WebSocket para actualizaciones
    useEffect(() => {
        if (!isAuthenticated) return

        const token = keycloak.token
        const newSocket = io(`${API_BASE}/reservas`, {
            transports: ['websocket', 'polling'],
            auth: { token },
            query: { token },
        })

        newSocket.on('cancellation_requested', (data) => {
            console.log('🚫 Nueva solicitud de cancelación:', data)
            if (data.reservation?.estado === 'CANCELLATION_REQUESTED') {
                setReservations((prev) => {
                    if (prev.find(r => r.id === data.reservation.id)) return prev
                    return [...prev, data.reservation]
                })
            }
        })

        newSocket.on('reservation_cancelled', (data) => {
            console.log('✅ Cancelación procesada:', data)
            setReservations((prev) =>
                prev.filter((r) => r.id !== data.reservation?.id)
            )
        })

        newSocket.on('reservation_updated', (data) => {
            console.log('🔄 Reserva actualizada:', data)
            if (data.reservation?.estado !== 'CANCELLATION_REQUESTED') {
                setReservations((prev) =>
                    prev.filter((r) => r.id !== data.reservation?.id)
                )
            }
        })

        return () => {
            newSocket.disconnect()
        }
    }, [isAuthenticated])

    useEffect(() => {
        loadReservations()
    }, [loadReservations])

    // Aprobar cancelación
    const handleApprove = async (id: string) => {
        try {
            const reservation = reservations.find(r => r.id === id)
            const spaceId = reservation?.space_id

            const result = await approveCancellation(id)
            setReservations((prev) => prev.filter((r) => r.id !== id))

            if (spaceId) {
                const updates: { reservationStatus: 'AVAILABLE'; label?: string } = {
                    reservationStatus: 'AVAILABLE'
                }
                if (result.updatedSpaceName) {
                    updates.label = result.updatedSpaceName
                }
                updateStand(spaceId, updates)
            }
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Error al aprobar')
        }
    }

    // Rechazar cancelación
    const handleReject = async (id: string) => {
        try {
            const reservation = reservations.find(r => r.id === id)
            const spaceId = reservation?.space_id

            await rejectCancellation(id)
            setReservations((prev) => prev.filter((r) => r.id !== id))

            // El stand permanece RESERVED
            if (spaceId) {
                updateStand(spaceId, { reservationStatus: 'RESERVED' })
            }
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Error al rechazar')
        }
    }

    if (loading) {
        return <div className="pending-reservations pending-reservations--loading">Cargando...</div>
    }

    if (error) {
        return (
            <div className="pending-reservations pending-reservations--error">
                <p>Error: {error}</p>
                <button onClick={loadReservations}>Reintentar</button>
            </div>
        )
    }

    if (reservations.length === 0) {
        return null // No mostrar si no hay cancelaciones pendientes
    }

    return (
        <div className="pending-reservations">
            <h3>
                Cancelaciones Pendientes
                <span className="pending-reservations__badge pending-reservations__badge--cancel">
                    {reservations.length}
                </span>
            </h3>

            <ul className="pending-reservations__list">
                {reservations.map((reservation) => {
                    const isExpanded = expandedId === reservation.id

                    const handleToggle = async () => {
                        if (isExpanded) {
                            setExpandedId(null)
                            setProfileData(null)
                        } else {
                            setExpandedId(reservation.id)
                            if (reservation.user_id) {
                                setProfileLoading(true)
                                try {
                                    const profile = await fetchUserProfileById(reservation.user_id)
                                    setProfileData(profile)
                                } catch (err) {
                                    console.error('Error loading profile:', err)
                                    setProfileData(null)
                                } finally {
                                    setProfileLoading(false)
                                }
                            }
                        }
                    }

                    return (
                        <li key={reservation.id} className={`pending-reservations__item ${isExpanded ? 'pending-reservations__item--expanded' : ''}`}>
                            <div className="pending-reservations__header" onClick={handleToggle}>
                                <div className="pending-reservations__info">
                                    <span className="pending-reservations__space">
                                        {reservation.space_name || `Stand ${reservation.space_id.slice(0, 8)}`}
                                    </span>
                                    {reservation.asignee && (
                                        <span className="pending-reservations__asignee">
                                            Solicitado por: {reservation.asignee}
                                        </span>
                                    )}
                                </div>
                                <div className="pending-reservations__actions">
                                    <button
                                        className="pending-reservations__btn pending-reservations__btn--confirm"
                                        onClick={(e) => { e.stopPropagation(); handleApprove(reservation.id) }}
                                        title="Aprobar cancelación"
                                    >
                                        ✓
                                    </button>
                                    <button
                                        className="pending-reservations__btn pending-reservations__btn--reject"
                                        onClick={(e) => { e.stopPropagation(); handleReject(reservation.id) }}
                                        title="Rechazar cancelación"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="pending-reservations__details">
                                    {profileLoading ? (
                                        <p className="pending-reservations__details-loading">Cargando datos...</p>
                                    ) : profileData ? (
                                        <>
                                            {profileData.email && (
                                                <div className="pending-reservations__detail">
                                                    <span className="pending-reservations__detail-label">📧 Email:</span>
                                                    <a href={`mailto:${profileData.email}`}>{profileData.email}</a>
                                                </div>
                                            )}
                                            {profileData.phone && (
                                                <div className="pending-reservations__detail">
                                                    <span className="pending-reservations__detail-label">📞 Tel:</span>
                                                    <span>{profileData.phone}</span>
                                                </div>
                                            )}
                                            {profileData.company && (
                                                <div className="pending-reservations__detail">
                                                    <span className="pending-reservations__detail-label">🏢 Empresa:</span>
                                                    <span>{profileData.company}</span>
                                                </div>
                                            )}
                                            {!profileData.email && !profileData.company && (
                                                <p className="pending-reservations__no-profile">Sin datos de perfil</p>
                                            )}
                                        </>
                                    ) : (
                                        <p className="pending-reservations__no-profile">Sin datos de perfil</p>
                                    )}
                                </div>
                            )}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

export default PendingCancellations
