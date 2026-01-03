import { useState, type FormEvent } from 'react';
import { useAuth } from './AuthContext';
import './LoginModal.css';

const LoginModal = () => {
    const { showLoginModal, setShowLoginModal, login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!showLoginModal) return null;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const success = await login(username, password);

        setIsLoading(false);
        if (!success) {
            setError('Usuario o contraseña incorrectos');
        }
    };

    const handleClose = () => {
        setShowLoginModal(false);
        setError('');
        setUsername('');
        setPassword('');
    };

    return (
        <div className="login-modal-overlay" onClick={handleClose}>
            <div className="login-modal" onClick={(e) => e.stopPropagation()}>
                <button className="login-modal__close" onClick={handleClose}>×</button>
                <h2 className="login-modal__title">Iniciar sesión</h2>

                <form onSubmit={handleSubmit} className="login-modal__form">
                    <div className="login-modal__field">
                        <label htmlFor="username">Usuario</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="usuario"
                            required
                        />
                    </div>

                    <div className="login-modal__field">
                        <label htmlFor="password">Contraseña</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && <p className="login-modal__error">{error}</p>}

                    <button
                        type="submit"
                        className="login-modal__submit"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Ingresando...' : 'Ingresar'}
                    </button>
                </form>

                <div className="login-modal__hint">
                    <p><strong>Usuarios demo:</strong></p>
                    <p>admin / admin123</p>
                    <p>cliente / cliente123</p>
                </div>
            </div>
        </div>
    );
};

export default LoginModal;
