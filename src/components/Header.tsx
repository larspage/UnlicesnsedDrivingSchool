import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthService from '../services/authService';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
          <Link to="/" className="text-xl md:text-2xl font-bold njdsc-brand">
            NJDSC Compliance Portal
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
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

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-200">
            <nav className="flex flex-col space-y-2 pt-4">
              <Link
                to="/"
                className={`px-3 py-2 rounded-md text-base font-medium ${
                  location.pathname === '/' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                to="/report"
                className={`px-3 py-2 rounded-md text-base font-medium ${
                  location.pathname === '/report' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Report Issue
              </Link>
              <Link
                to="/reports"
                className={`px-3 py-2 rounded-md text-base font-medium ${
                  location.pathname === '/reports' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                View Reports
              </Link>

              {/* Admin link - only show if authenticated */}
              {isAuthenticated && (
                <Link
                  to="/admin"
                  className={`px-3 py-2 rounded-md text-base font-medium ${
                    location.pathname.startsWith('/admin') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Admin
                </Link>
              )}

              {/* Authentication section */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                {isAuthenticated ? (
                  <div className="space-y-2">
                    <div className="px-3 py-2 text-sm text-gray-600">
                      Welcome, <span className="font-medium">{currentUser?.username}</span>
                    </div>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-base font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    className="block px-3 py-2 text-base font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Admin Login
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;