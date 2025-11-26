import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import UserManagement from './UserManagement';
import ProjectsPage from '../Projects/Projects';
import DashboardLayout from '../../components/DashboardLayout';

function Dashboard({ user, onLogout }) {
  const links = [
    { to: '', label: 'Dashboard' },
    { to: 'projects', label: 'Projects' },
    { to: 'users', label: 'User Management' },
  ];

  const logoutHandler = () => {
    if (onLogout) onLogout();
  };

  return (
    <DashboardLayout user={user} title="Super Admin" links={links} onLogout={logoutHandler}>
      {/* nested routes are provided via Outlet in DashboardLayout */}
      <Routes>
        <Route path="" element={<DashboardHome user={user} />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="projects" element={<ProjectsPage user={user} onLogout={onLogout} />} />
      </Routes>
    </DashboardLayout>
  );
}

function DashboardHome({ user }) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAdmins: 0,
    totalReviewers: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const result = await window.electronAPI.getAllUsers({});
      if (result.success) {
        const users = result.users;
        setStats({
          totalUsers: users.length,
          totalAdmins: users.filter(u => u.role === 'admin').length,
          totalReviewers: users.filter(u => u.role === 'reviewer').length,
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard title="Total Users" value={stats.totalUsers} color="blue" />
        <StatCard title="Administrators" value={stats.totalAdmins} color="green" />
        <StatCard title="Reviewers" value={stats.totalReviewers} color="purple" />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Welcome, {user.firstName || user.username}</h2>
        <p className="text-gray-600">
          You have full access to all system features. Use the sidebar to navigate through different sections.
        </p>
      </div>
    </div>
  );
}

function StatCard({ title, value, color }) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
        <div className={`w-12 h-12 ${colorClasses[color]} rounded-lg opacity-20`}></div>
      </div>
    </div>
  );
}

export default Dashboard;
