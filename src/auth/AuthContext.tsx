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
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
    showLoginModal: boolean;
    setShowLoginModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [isInitialized, setIsInitialized] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const initCalled = useRef(false);

    // Initial check with Keycloak (SSO)
    useEffect(() => {
        if (initCalled.current) return;
        initCalled.current = true;

        keycloak.init({
            onLoad: 'check-sso',
            checkLoginIframe: false,
            silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html'
        }).then((authenticated) => {
            if (authenticated) {
                setUserDataFromToken();
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

    const setUserDataFromToken = (token: Record<string, unknown> = keycloak.tokenParsed as Record<string, unknown>) => {
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

    const hasRole = (role: string): boolean => {
        return user?.roles.includes(role) ?? false;
    };

    // Manual login using Resource Owner Password Credentials Grant
    const login = async (username: string, password: string): Promise<boolean> => {
        try {
            const baseUrl = import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080';
            const realm = import.meta.env.VITE_KEYCLOAK_REALM || 'reserva-espacios';
            const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'front-admin';
            // Note: If client is public, client_secret is not needed. 'front-admin' is usually public.

            const params = new URLSearchParams();
            params.append('client_id', clientId);
            params.append('grant_type', 'password');
            params.append('username', username);
            params.append('password', password);
            params.append('scope', 'openid');

            const response = await fetch(`${baseUrl}/realms/${realm}/protocol/openid-connect/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params
            });

            if (!response.ok) {
                console.error('Login failed:', await response.text());
                return false;
            }

            const data = await response.json();

            // We have a token! 
            // In a full implementation, we would feed this to keycloak-js or manage refresh manually.
            // For now, we decode it to get user info and update UI state.

            // Simple decode function (we trust the source since we just fetched it)
            const tokenParts = data.access_token.split('.');
            if (tokenParts.length !== 3) return false;

            const payload = JSON.parse(atob(tokenParts[1]));

            // Update state
            setUserDataFromToken(payload);
            setIsAuthenticated(true);
            setShowLoginModal(false);

            return true;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    };

    const logout = () => {
        // If we are authenticated via Keycloak.js instance
        if (keycloak.authenticated) {
            keycloak.logout({ redirectUri: window.location.origin });
        } else {
            // Manual logout cleanup
            setIsAuthenticated(false);
            setUser(null);
            // Optionally redirect or reload to ensure state clear
        }
    };

    return (
        <AuthContext.Provider value={{
            isInitialized,
            isAuthenticated,
            user,
            hasRole,
            login,
            logout,
            showLoginModal,
            setShowLoginModal
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
