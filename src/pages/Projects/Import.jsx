import React, { useState } from 'react';

export default function ImportPage() {
  const [filePath, setFilePath] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  const handleFileChange = (e) => {
    setResult(null);
    setError(null);
    const f = e.target.files && e.target.files[0];
    if (f) {
      // Electron exposes `path` on the File object
      setFilePath(f.path || '');
    } else {
      setFilePath('');
    }
  };

  const handleImport = async () => {
    if (!filePath) {
      setError('Selecciona un archivo antes de importar');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await window.electronAPI.importExcel(filePath);
      setResult(res);
      await loadHistory();
    } catch (err) {
      setError(err && err.message ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await window.electronAPI.getImportHistory();
      if (res && res.success) setHistory(res.imports || []);
      else setHistory([]);
    } catch (err) {
      console.error('Failed to load import history', err);
      setHistory([]);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Eliminar todo el historial de importaciones?')) return;
    try {
      await window.electronAPI.clearImportHistory();
      await loadHistory();
    } catch (err) {
      console.error('Failed to clear history', err);
    }
  };

  React.useEffect(() => { loadHistory(); }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Importar desde Excel</h1>

      <div className="bg-white p-4 rounded shadow mb-4">
        <p className="text-sm text-gray-600 mb-2">Selecciona el archivo Excel exportado por la universidad.</p>
        <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="mb-3" />
        <div className="flex items-center space-x-2">
          <button onClick={handleImport} disabled={loading} className="px-3 py-1 bg-blue-600 text-white rounded">{loading ? 'Importando...' : 'Importar'}</button>
          <div className="text-sm text-gray-600">{filePath}</div>
        </div>
        {error && <div className="mt-3 text-red-600">{error}</div>}
      </div>

      {result && (
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Resultado</h2>
          <div className="p-3 bg-green-50 rounded mb-2">
            <strong className="text-green-800">Importación completa</strong>
            <div className="text-sm text-gray-700">{result && result.results ? `${result.results.createdProjects} proyectos, ${result.results.createdDeliveries} entregas creadas. Errores: ${result.results.errors.length}` : ''}</div>
          </div>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Historial de importaciones</h2>
          <div>
            <button onClick={loadHistory} className="px-3 py-1 mr-2 border rounded">Refrescar</button>
            <button onClick={handleClearHistory} className="px-3 py-1 bg-red-600 text-white rounded">Limpiar historial</button>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          {history.length === 0 ? (
            <div className="text-gray-600">No hay importaciones registradas.</div>
          ) : (
            <ul className="space-y-3">
              {history.map(h => (
                <li key={h._id} className="p-3 border rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{h.fileName || 'Archivo sin nombre'}</div>
                      <div className="text-sm text-gray-600">{new Date(h.importedAt).toLocaleString()}</div>
                    </div>
                    <div className="text-sm text-gray-700">{h.summary ? `${h.summary.createdProjects} proyectos • ${h.summary.createdDeliveries} entregas • ${h.summary.errors} errores` : ''}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
