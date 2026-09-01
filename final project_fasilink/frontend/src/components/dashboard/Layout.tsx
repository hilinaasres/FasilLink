import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardNavbar, DashboardSidebar } from '../../components/dashboard/DashboardNavbar';
import { useDashboard } from '../../context/DashboardContext';

const DashboardLayout: React.FC = () => {
  const { isDarkMode } = useDashboard();

  return (
    <div className={`dashboard-layout ${isDarkMode ? 'dark' : ''}`}>
      <DashboardSidebar />
      <div className="dashboard-main">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <Outlet />
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardLayout;