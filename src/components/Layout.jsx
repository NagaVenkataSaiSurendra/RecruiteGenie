import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link, useLocation, Outlet } from 'react-router-dom';
import { 
  FileText, 
  Users, 
  BarChart3, 
  Building2,
  UserCircle
} from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine dashboard link based on user role
  const dashboardLink = user?.role === 'ar_requestor' ? '/ar-dashboard' : '/recruiter-dashboard';

  const navigation = [
    { name: 'Dashboard', href: dashboardLink, icon: BarChart3 },
    { name: 'Job Descriptions', href: '/job-descriptions', icon: FileText },
    { name: 'Consultant Profiles', href: '/consultant-profiles', icon: Users },
    { name: 'Matching Results', href: '/matching-results', icon: BarChart3 },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link to={dashboardLink} className="flex items-center space-x-2">
                <Building2 className="w-8 h-8 text-indigo-600" />
                <h1 className="text-xl font-semibold text-gray-900">RecruitMatch</h1>
              </Link>
              
              {/* Navigation Links */}
              <nav className="hidden md:flex space-x-4">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className={`w-5 h-5 mr-2 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {user && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <UserCircle className="w-8 h-8 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {user.fullName || user.email.split('@')[0]}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;