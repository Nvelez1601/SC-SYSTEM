import React from 'react';
import { Link, Outlet } from 'react-router-dom';

export default function DashboardLayout({ user, title = '', links = [], onLogout, children }) {
  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <p className="text-sm text-gray-600 mt-1">{user && user.username}</p>
        </div>

        <nav className="p-4">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg mb-2"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 w-64 p-4 border-t">
          <button
            onClick={onLogout}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        {/* If callers passed children (Routes JSX) render them, otherwise fall back to Outlet */}
        {children ? children : <Outlet />}
      </main>
    </div>
  );
}
