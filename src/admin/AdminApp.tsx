import { useState, useEffect } from 'react'
import StandCanvas from './components/StandCanvas'
import StandList from './components/StandList'
import ZoneList from './components/ZoneList'
import Toolbar from './components/Toolbar'
import EventSelector from './components/EventSelector'
import PendingReservations from './components/PendingReservations'
import { useAuth } from '../auth/AuthContext'
import { useStandStore } from './store/standStore'
import { fetchEventos } from './services/api'
import './admin.css'

const AdminApp = () => {
    const { user, logout } = useAuth()
    const backgroundUrl = useStandStore((state) => state.backgroundUrl)
    const eventoId = useStandStore((state) => state.eventoId)
    const [hasEventos, setHasEventos] = useState<boolean | null>(null) // null = loading

    useEffect(() => {
        const checkEventos = async () => {
            try {
                const eventos = await fetchEventos()
                setHasEventos(eventos.length > 0)
            } catch {
                setHasEventos(false)
            }
        }
        checkEventos()
    }, [eventoId])

    return (
        <div className="admin-layout">
            {/* Top Header */}
            <header className="admin-header">
                <div className="admin-header__brand">
                    <img
                        src="/src/assets/LogoUniversidadMontevideo.png"
                        alt="Universidad de Montevideo"
                        className="admin-header__logo"
                    />
                    <div className="admin-header__titles">
                        <h1 className="admin-header__title">Admin - Reserva Espacios</h1>
                        <p className="admin-header__subtitle">Editor de áreas interactivo</p>
                    </div>
                </div>
                <div className="admin-header__user">
                    <span className="admin-header__user-name">
                        Hola, <strong>{user?.name || 'Admin'}</strong>
                    </span>
                    <button onClick={logout} className="admin-header__logout">
                        Cerrar sesión
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="admin-content">
                {/* Left Sidebar - Toolbar */}
                <aside className="admin-sidebar">
                    <Toolbar />
                </aside>

                {/* Center - Workspace */}
                <main className="admin-workspace">
                    {/* Header with Event and Plano selectors */}
                    <div className="workspace-header">
                        <EventSelector />
                    </div>

                    {/* Canvas Area */}
                    <div className="canvas-container">
                        {hasEventos === null ? (
                            <div className="canvas-empty-message">
                                <div className="canvas-empty-message__icon">⏳</div>
                                <p>Cargando eventos...</p>
                            </div>
                        ) : !hasEventos ? (
                            <div className="canvas-empty-message">
                                <div className="canvas-empty-message__icon">📅</div>
                                <h2>No hay eventos disponibles</h2>
                                <p>Crea un nuevo evento usando el botón "+" en el selector de eventos para comenzar.</p>
                            </div>
                        ) : (
                            <div className="canvas-wrapper">
                                <StandCanvas backgroundSrc={backgroundUrl} />
                            </div>
                        )}
                    </div>
                </main>

                {/* Right Panel - Inspector */}
                <aside className="admin-inspector">
                    <PendingReservations />
                    <StandList />
                    <ZoneList />
                </aside>
            </div>
        </div>
    )
}

export default AdminApp

