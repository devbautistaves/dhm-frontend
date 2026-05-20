import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo-area">
          <img src="/logo-dhm.png" alt="DHM" className="logo" onError={(e) => { e.target.style.display = 'none'; }} />
          <div>
            <h1>DHM Distribuidora</h1>
            <p>Materiales eléctricos y más</p>
          </div>
        </div>
        <nav className="nav-links">
          <Link to="/" className={pathname === '/' ? 'active' : ''}>
            <i className="fas fa-box-open" /> Catálogo
          </Link>
          {user ? (
            <>
              <Link to="/admin" className={pathname === '/admin' ? 'active' : ''}>
                <i className="fas fa-cog" /> Admin
              </Link>
              <button className="btn-logout" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt" /> Salir
              </button>
            </>
          ) : (
            <Link to="/login" className={pathname === '/login' ? 'active' : ''}>
              <i className="fas fa-lock" /> Admin
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
