import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthService from '../services/authService';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const authService = AuthService.getInstance();

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated();
      const user = authService.getCurrentUser();
      setIsAuthenticated(authenticated);
      setCurrentUser(user);
    };

    checkAuth();

    // Listen for storage changes (login/logout from other tabs)
    const handleStorageChange = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
      setIsAuthenticated(false);
      setCurrentUser(null);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout on frontend even if API call fails
      authService.logout();
      setIsAuthenticated(false);
      setCurrentUser(null);
      navigate('/');
    }
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold njdsc-brand">
            NJDSC Compliance Portal
          </Link>
          <nav className="flex items-center space-x-6">
            <Link
              to="/"
              className={`hover:text-blue-600 ${
                location.pathname === '/' ? 'text-blue-600 font-medium' : 'text-gray-600'
              }`}
            >
              Home
            </Link>
            <Link
              to="/report"
              className={`hover:text-blue-600 ${
                location.pathname === '/report' ? 'text-blue-600 font-medium' : 'text-gray-600'
              }`}
            >
              Report Issue
            </Link>
            <Link
              to="/reports"
              className={`hover:text-blue-600 ${
                location.pathname === '/reports' ? 'text-blue-600 font-medium' : 'text-gray-600'
              }`}
            >
              View Reports
            </Link>

            {/* Admin link - only show if authenticated */}
            {isAuthenticated ? (
              <Link
                to="/admin"
                className={`hover:text-blue-600 ${
                  location.pathname.startsWith('/admin') ? 'text-blue-600 font-medium' : 'text-gray-600'
                }`}
              >
                Admin
              </Link>
            ) : null}

            {/* Authentication section */}
            <div className="flex items-center space-x-4 ml-6 pl-6 border-l border-gray-300">
              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">
                    Welcome, <span className="font-medium">{currentUser?.username}</span>
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Admin Login
                </Link>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;