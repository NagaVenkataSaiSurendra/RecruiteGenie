import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link, useLocation, Outlet } from 'react-router-dom';
import { 
  FileText, 
  Users, 
  BarChart3, 
  Building2,
  UserCircle,
  Bot
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

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
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-dark-800 shadow-sm border-b border-gray-200 dark:border-dark-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link to={dashboardLink} className="flex items-center space-x-2 group">
                <Bot className="w-8 h-8 text-primary-600 dark:text-primary-400 group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors duration-200" />
                <div className="flex flex-col">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-gray-200 tracking-wide group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200">RECRUITGENIE</h1>
                  <span className="text-xs text-primary-500 dark:text-primary-400 font-medium">Your AI-powered recruitment assistant</span>
                </div>
              </Link>
              
              {/* Navigation Links */}
              <nav className="hidden md:flex space-x-4">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 shadow-sm'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      <item.icon className={`w-5 h-5 mr-2 transition-colors duration-200 ${
                        isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'
                      }`} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {user && (
              <div className="flex items-center space-x-4">
                <ThemeToggle />
                <div className="flex items-center space-x-2">
                  <UserCircle className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {user.fullName || user.email.split('@')[0]}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-dark-800 transition-colors duration-200"
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