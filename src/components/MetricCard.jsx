import React from 'react';

const MetricCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = 'primary',
  trend,
  trendValue,
  className = '',
  loading = false 
}) => {
  const colorClasses = {
    primary: 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20',
    success: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
    warning: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20',
    danger: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
    info: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
  };

  const trendColors = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-600 dark:text-gray-400',
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-dark-800 rounded-xl shadow-lg p-6 animate-pulse ${className}`}>
        <div className="flex items-center">
          <div className="w-12 h-12 bg-gray-200 dark:bg-dark-600 rounded-full"></div>
          <div className="ml-4 flex-1">
            <div className="h-4 bg-gray-200 dark:bg-dark-600 rounded w-24 mb-2"></div>
            <div className="h-8 bg-gray-200 dark:bg-dark-600 rounded w-16"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-dark-800 rounded-2xl shadow-2xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 ${className}`}>
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="w-8 h-8" />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-base font-semibold text-gray-600 dark:text-gray-400">{title}</p>
          <div className="flex items-center mt-2">
            <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-200">{value}</p>
            {trend && (
              <div className={`ml-2 flex items-center text-sm font-medium ${trendColors[trend]}`}>
                {trend === 'up' && <span>↗</span>}
                {trend === 'down' && <span>↘</span>}
                {trend === 'neutral' && <span>→</span>}
                <span className="ml-1">{trendValue}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricCard;