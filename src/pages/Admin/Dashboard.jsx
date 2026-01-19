import React from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import ProjectsPage from '../Projects/Projects';
import ImportPage from '../Projects/Import';
import DashboardLayout from '../../components/DashboardLayout';

function Dashboard({ user, onLogout }) {
  const links = [
    { to: '', label: 'Dashboard' },
    { to: 'projects', label: 'Projects' },
    { to: 'projects/import', label: 'Import' },
  ];

  const logoutHandler = () => {
    if (onLogout) onLogout();
  };

  return (
    <DashboardLayout user={user} title="Administrator" links={links} onLogout={logoutHandler}>
      <Routes>
        <Route
          path=""
          element={
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-8">Administrator Dashboard</h1>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600">Administrator features coming soon...</p>
              </div>
            </div>
          }
        />
        <Route path="projects" element={<ProjectsPage user={user} onLogout={onLogout} />} />
        <Route path="projects/import" element={<ImportPage user={user} onLogout={onLogout} />} />
      </Routes>
    </DashboardLayout>
  );
}

export default Dashboard;
