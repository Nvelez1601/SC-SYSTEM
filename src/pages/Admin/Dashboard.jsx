import React from 'react';
import { Routes, Route } from 'react-router-dom';

function Dashboard({ user, onLogout }) {
  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">Administrator</h2>
          <p className="text-sm text-gray-600 mt-1">{user.username}</p>
        </div>

        <nav className="p-4">
          <Link
            to="/admin"
            className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg mb-2"
          >
            Dashboard
          </Link>
          <a href="/admin/projects" className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg mb-2">
            Projects
          </a>
        </nav>

        <div className="absolute bottom-0 w-64 p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Administrator Dashboard</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Administrator features coming soon...</p>
        </div>
      </main>
    </div>
  );
}

const handleLogout = () => {
  if (onLogout) onLogout();
  navigate('/login');
};

import React from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import ProjectsPage from '../Projects/Projects';

function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onLogout) onLogout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">Administrator</h2>
          <p className="text-sm text-gray-600 mt-1">{user.username}</p>
        </div>

        <nav className="p-4">
          <Link
            to="/admin"
            className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg mb-2"
          >
            Dashboard
          </Link>
          <Link
            to="/admin/projects"
            className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg mb-2"
          >
            Projects
          </Link>
        </nav>

        <div className="absolute bottom-0 w-64 p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <Routes>
          <Route
            path="/"
            element={
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-8">Administrator Dashboard</h1>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-gray-600">Administrator features coming soon...</p>
                </div>
              </div>
            }
          />
          <Route path="/projects" element={<ProjectsPage user={user} onLogout={onLogout} />} />
        </Routes>
      </main>
    </div>
  );
}

export default Dashboard;
