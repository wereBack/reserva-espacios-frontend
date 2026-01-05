import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import keycloak from './keycloak';

interface User {
    name: string;
    username: string;
    roles: string[];
}

interface AuthContextType {
    isAuthenticated: boolean;
    isInitialized: boolean;
    user: User | null;
    hasRole: (role: string) => boolean;
    login: () => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [isInitialized, setIsInitialized] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const initCalled = useRef(false);

    useEffect(() => {
        if (initCalled.current) return;
        initCalled.current = true;

        const updateUserFromToken = () => {
            const token = keycloak.tokenParsed;
            if (!token) return;

            const realmRoles = (token.realm_access as { roles?: string[] })?.roles || [];
            const resourceRoles = (token.resource_access as Record<string, { roles?: string[] }>)?.['front-admin']?.roles || [];
            const allRoles = [...realmRoles, ...resourceRoles];

            setUser({
                name: (token.name as string) || (token.preferred_username as string) || 'Usuario',
                username: (token.preferred_username as string) || '',
                roles: allRoles
            });
        };

        keycloak.init({
            onLoad: 'check-sso',
            checkLoginIframe: false,
            silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html'
        }).then((authenticated) => {
            if (authenticated) {
                updateUserFromToken();
                setIsAuthenticated(true);
            }
            setIsInitialized(true);
        }).catch((error) => {
            console.error('Keycloak init error:', error);
            setIsInitialized(true);
        });

        keycloak.onTokenExpired = () => {
            keycloak.updateToken(30).catch(() => {
                setIsAuthenticated(false);
                setUser(null);
            });
        };
    }, []);

    const hasRole = (role: string): boolean => {
        return user?.roles.includes(role) ?? false;
    };

    // Login usando el flujo estandar de Keycloak (redirige a la pagina de login de Keycloak)
    const login = () => {
        keycloak.login();
    };

    const logout = () => {
        keycloak.logout({ redirectUri: window.location.origin });
    };

    return (
        <AuthContext.Provider value={{
            isInitialized,
            isAuthenticated,
            user,
            hasRole,
            login,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
