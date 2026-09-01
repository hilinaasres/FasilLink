import React from 'react';
import { motion } from 'framer-motion';

interface DashboardCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  iconBg?: string;
  trend?: { value: string; up: boolean };
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  icon,
  title,
  value,
  subtitle,
  iconBg = 'bg-red-50 text-red-600',
  trend,
}) => (
  <motion.div
    className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300"
    whileHover={{ y: -2 }}
  >
    <div className="flex items-center justify-between">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${iconBg}`}>
        {icon}
      </div>
      {trend && (
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trend.up ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
          {trend.value}
        </span>
      )}
    </div>
    <div className="mt-4">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  </motion.div>
);

export default DashboardCard;