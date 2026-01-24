import { useState, useEffect } from 'react'

/**
 * Hook para detectar si estamos en un dispositivo móvil
 * Basado en el ancho de la ventana y capacidades touch
 */
export function useIsMobile(breakpoint = 768): boolean {
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === 'undefined') return false
        return window.innerWidth < breakpoint
    })

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < breakpoint)
        }

        // También detectar cambios de orientación
        window.addEventListener('resize', checkMobile)
        window.addEventListener('orientationchange', checkMobile)

        return () => {
            window.removeEventListener('resize', checkMobile)
            window.removeEventListener('orientationchange', checkMobile)
        }
    }, [breakpoint])

    return isMobile
}

/**
 * Hook para detectar si es dispositivo táctil
 */
export function useIsTouchDevice(): boolean {
    const [isTouch, setIsTouch] = useState(() => {
        if (typeof window === 'undefined') return false
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0
    })

    useEffect(() => {
        setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0)
    }, [])

    return isTouch
}
