import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      await login(form);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <img src="/logo-dhm.png" alt="DHM" onError={(e) => { e.target.style.display = 'none'; }} />
          <h2>DHM Distribuidora</h2>
          <p>Panel Administrativo</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="form-error"><i className="fas fa-exclamation-circle" /> {error}</div>}

          <div className="form-group">
            <label><i className="fas fa-user" /> Usuario</label>
            <input
              value={form.username}
              onChange={set('username')}
              placeholder="admin"
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label><i className="fas fa-lock" /> Contraseña</label>
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading
              ? <><i className="fas fa-spinner fa-spin" /> Ingresando...</>
              : <><i className="fas fa-sign-in-alt" /> Ingresar</>}
          </button>
        </form>

        <a href="/" className="login-back"><i className="fas fa-arrow-left" /> Volver al catálogo</a>
      </div>
    </div>
  );
}
