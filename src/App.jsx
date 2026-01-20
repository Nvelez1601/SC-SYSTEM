import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import SuperAdminDashboard from './pages/SuperAdmin/Dashboard';
import AdminDashboard from './pages/Admin/Dashboard';
import ReviewerDashboard from './pages/Reviewer/Dashboard';
import ProjectsPage from './pages/Projects/Projects';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    try {
      const result = await window.electronAPI.getCurrentUser();
      if (result.success && result.user) {
        setCurrentUser(result.user);
      }
    } catch (error) {
      console.error('Error checking current user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    try {
      await window.electronAPI.logout();
      setCurrentUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            currentUser ? (
              <Navigate to={getDashboardRoute(currentUser.role)} replace />
            ) : (
              <Login onLogin={handleLogin} />
            )
          }
        />
        <Route
          path="/super-admin/*"
          element={
            currentUser && currentUser.role === 'super_admin' ? (
              <SuperAdminDashboard user={currentUser} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        {/* Projects are handled inside the dashboard layouts (nested routes)
            so no standalone top-level /super-admin/projects route is needed. */}
        <Route
          path="/admin/*"
          element={
            currentUser && currentUser.role === 'admin' ? (
              <AdminDashboard user={currentUser} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        {/* Projects route for admin is nested inside the AdminDashboard layout. */}
        <Route
          path="/reviewer/*"
          element={
            currentUser && (currentUser.role === 'reviewer' || currentUser.role === 'admin' || currentUser.role === 'super_admin') ? (
              <ReviewerDashboard user={currentUser} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/"
          element={
            currentUser ? (
              <Navigate to={getDashboardRoute(currentUser.role)} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

function getDashboardRoute(role) {
  switch (role) {
    case 'super_admin':
      return '/super-admin';
    case 'admin':
      return '/admin';
    case 'reviewer':
      return '/reviewer';
    default:
      return '/login';
  }
}

export default App;
