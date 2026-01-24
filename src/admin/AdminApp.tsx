import { useState, useEffect } from 'react'
import { useShallow } from 'zustand/shallow'
import StandCanvas from './components/StandCanvas'
import StandList from './components/StandList'
import ZoneList from './components/ZoneList'
import Toolbar from './components/Toolbar'
import EventSelector from './components/EventSelector'
import PendingReservations from './components/PendingReservations'
import PendingCancellations from './components/PendingCancellations'
import MeasuredSizeModal from './components/MeasuredSizeModal'
import { useAuth } from '../auth/AuthContext'
import { useStandStore } from './store/standStore'
import { fetchEventos } from './services/api'
import logoUM from '../assets/LogoUniversidadMontevideo.png'
import './admin.css'

const AdminApp = () => {
    const { user, logout } = useAuth()
    // Usar shallow compare para evitar re-renders innecesarios
    const { backgroundUrl, eventoId } = useStandStore(
        useShallow((state) => ({
            backgroundUrl: state.backgroundUrl,
            eventoId: state.eventoId,
        }))
    )
    const [hasEventos, setHasEventos] = useState<boolean | null>(null) // null = loading

    // Mobile responsive state
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [isInspectorExpanded, setIsInspectorExpanded] = useState(false)

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

    // Close sidebar when clicking overlay
    const closeSidebar = () => setIsSidebarOpen(false)

    // Toggle inspector on mobile
    const toggleInspector = () => setIsInspectorExpanded(!isInspectorExpanded)

    return (
        <div className="admin-layout">
            {/* Top Header */}
            <header className="admin-header">
                <div className="admin-header__brand">
                    {/* Mobile menu button */}
                    <button
                        className="admin-header__menu-btn"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        aria-label="Abrir menú"
                    >
                        ☰
                    </button>
                    <img
                        src={logoUM}
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
                {/* Overlay for mobile sidebar */}
                <div
                    className={`admin-sidebar-overlay ${isSidebarOpen ? 'is-visible' : ''}`}
                    onClick={closeSidebar}
                />

                {/* Left Sidebar - Toolbar */}
                <aside className={`admin-sidebar ${isSidebarOpen ? 'is-open' : ''}`}>
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

                {/* Right Panel - Inspector (bottom sheet on mobile) */}
                <aside
                    className={`admin-inspector ${isInspectorExpanded ? 'is-expanded' : ''}`}
                    onClick={toggleInspector}
                >
                    <PendingReservations />
                    <PendingCancellations />
                    <StandList />
                    <ZoneList />
                </aside>
            </div>

            {/* Modals */}
            <MeasuredSizeModal />
        </div>
    )
}

export default AdminApp
