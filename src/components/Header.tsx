import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const location = useLocation();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold njdsc-brand">
            NJDSC Compliance Portal
          </Link>
          <nav className="space-x-6">
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
            <Link
              to="/admin"
              className={`hover:text-blue-600 ${
                location.pathname.startsWith('/admin') ? 'text-blue-600 font-medium' : 'text-gray-600'
              }`}
            >
              Admin
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;