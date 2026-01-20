import React, { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';

export default function DashboardLayout({ user, title = '', links = [], onLogout, children }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-white">
      <header className="flex items-center justify-between bg-white/80 backdrop-blur shadow-sm px-4 py-3 sm:hidden">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <p className="text-xs text-slate-500">{user?.username}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="inline-flex items-center justify-center rounded-md border border-slate-300 p-2 text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Abrir menú"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </header>

      <div className="flex flex-col sm:flex-row min-h-[calc(100vh-56px)] sm:min-h-screen">
        <aside
          className={`bg-white/90 backdrop-blur shadow-sm sm:w-64 sm:flex-shrink-0 ${isMenuOpen ? 'block' : 'hidden'} sm:block`}
        >
          <div className="flex flex-col h-full max-h-screen">
            <div className="hidden sm:block p-6 border-b">
              <h2 className="text-xl font-bold text-slate-800">{title}</h2>
              <p className="text-sm text-slate-600 mt-1">{user?.username}</p>
            </div>

            <nav className="p-4 flex-1 overflow-y-auto">
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={closeMenu}
                  className="block px-4 py-2 text-slate-700 hover:bg-blue-100/60 hover:text-blue-700 rounded-lg mb-2 transition"
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            <div className="p-4 border-t mt-auto">
              <button
                onClick={() => {
                  closeMenu();
                  onLogout?.();
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* If callers passed children (Routes JSX) render them, otherwise fall back to Outlet */}
          {children ? children : <Outlet />}
        </main>
      </div>
    </div>
  );
}
