import React from 'react';

const DashboardCard = ({ 
  title, 
  children, 
  className = '', 
  icon: Icon, 
  gradient = false,
  onClick,
  hover = true 
}) => {
  const baseClasses = `
    bg-white dark:bg-dark-800 rounded-xl shadow-lg border border-gray-200 dark:border-dark-700 
    transition-all duration-300 
    ${hover ? 'hover:shadow-xl hover:-translate-y-1' : ''}
    ${onClick ? 'cursor-pointer' : ''}
    ${gradient ? 'bg-gradient-to-br from-white to-gray-50 dark:from-dark-800 dark:to-dark-700' : ''}
    ${className}
  `;

  return (
    <div className={baseClasses} onClick={onClick}>
      {title && (
        <div className="flex items-center justify-between p-6 pb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-200 flex items-center">
            {Icon && <Icon className="w-5 h-5 mr-2 text-primary-600 dark:text-primary-400" />}
            {title}
          </h3>
        </div>
      )}
      <div className={title ? 'px-6 pb-6' : 'p-6'}>
        {children}
      </div>
    </div>
  );
};

export default DashboardCard; 