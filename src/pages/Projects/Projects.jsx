import React from 'react';
import ReviewerDashboard from '../Reviewer/Dashboard';

export default function ProjectsPage({ user, onLogout }) {
  // If reviewer, show reviewer dashboard view (pending reviews)
  if (user && (user.role === 'reviewer' || user.role === 'admin' || user.role === 'super_admin')) {
    // Admins can also review; for now reuse ReviewerDashboard which shows pending deliveries
    return <ReviewerDashboard user={user} onLogout={onLogout} />;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Projects</h1>
      <p className="text-gray-600">Project management interface will be here for admins and super admins.</p>
    </div>
  );
}
