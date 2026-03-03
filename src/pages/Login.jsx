import React, { useState } from 'react';
import usmWordmark from '../assets/usm-wordmark.svg';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await window.electronAPI.login({ username, password });

      if (result.success) {
        onLogin(result.user);
      } else {
        setError(result.error || 'No se pudo iniciar sesión');
      }
    } catch (error) {
      setError('Ocurrió un error al iniciar sesión');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-usm-soft px-4 py-10">
      <div className="bg-white/95 backdrop-blur p-8 rounded-2xl shadow-xl w-full max-w-lg border border-blue-100">
        <div className="text-center mb-8">
          <img src={usmWordmark} alt="Universidad Santa Maria" className="h-14 mx-auto mb-4" />
          <h1 className="text-2xl md:text-3xl font-display text-usm-blue mb-2">
            Seguimiento de Servicio Comunitario
          </h1>
          <p className="text-slate-600">Accede con tu usuario institucional.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-2">
              Usuario
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
              placeholder="Ingresa tu usuario"
              required
              disabled={loading}
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
              placeholder="Ingresa tu contraseña"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-usm-hero text-white py-2.5 px-4 rounded-lg hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Iniciando sesión...' : 'Ingresar'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          <p>Si no tienes acceso, contacta a tu administrador.</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
