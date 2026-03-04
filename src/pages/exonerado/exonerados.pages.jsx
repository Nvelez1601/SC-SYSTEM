import React, { useEffect, useMemo, useState } from 'react';

const MIN_VENEZUELAN_ID_LENGTH = 6;
const MAX_VENEZUELAN_ID_LENGTH = 9;

const isValidVenezuelanId = (value) => {
  if (!value) return false;
  const cedula = String(value).trim();
  if (!cedula) return false;
  if (!/^\d+$/.test(cedula)) return false;
  if (cedula.length < MIN_VENEZUELAN_ID_LENGTH || cedula.length > MAX_VENEZUELAN_ID_LENGTH) return false;
  if (/^0+$/.test(cedula)) return false;
  return true;
};

const onlyDigits = (value) => (value ? String(value).replace(/\D/g, '') : '');

function ExoneradoPage() {
  const [formData, setFormData] = useState({
    code: '',
    apellido: '',
    nombre: '',
    cedula: '',
    universidadTsu: '',
    fechaServicio: '',
    titulo: '',
    observaciones: '',
    razonExoneracion: '',
    proyectoTitulo: '',
    proyectoCodigo: ''
  });

  const [exonerados, setExonerados] = useState([]);
  const [editando, setEditando] = useState(false);
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importFilePath, setImportFilePath] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');
  const [importHistory, setImportHistory] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const api = window.electronAPI || {};

  const loadExonerados = async () => {
    if (!api.getExonerados) return;
    try {
      const res = await api.getExonerados();
      setExonerados(res?.success ? res.exonerados ?? [] : []);
    } catch (error) {
      console.error('Error al cargar exonerados:', error);
      setExonerados([]);
    }
  };

  useEffect(() => {
    loadExonerados();
  }, []);

  const filteredExonerados = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return exonerados;
    return exonerados.filter((item) => [
      item.code,
      item.apellido,
      item.nombre,
      item.cedula,
      item.universidadTsu,
      item.razonExoneracion,
      item.proyectoTitulo,
      item.proyectoCodigo,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [exonerados, searchTerm]);

  const totalPages = useMemo(() => {
    const pages = Math.ceil(filteredExonerados.length / itemsPerPage);
    return pages > 0 ? pages : 1;
  }, [filteredExonerados.length, itemsPerPage]);

  const paginatedExonerados = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredExonerados.slice(start, start + itemsPerPage);
  }, [filteredExonerados, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const buildPageItems = (total, current) => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages = [1];
    if (current > 3) pages.push('...');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i += 1) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validación básica
    if (!formData.apellido || !formData.nombre || !formData.cedula) {
      alert('Por favor complete los campos obligatorios (*)');
      return;
    }

    if (!isValidVenezuelanId(formData.cedula)) {
      alert('La cédula debe ser numérica, con entre 6 y 9 dígitos y no puede ser solo ceros.');
      return;
    }

    try {
      if (editando && editId) {
        const res = await api.updateExonerado(editId, formData);
        if (!res?.success) {
          alert(res?.error || 'Error al actualizar el registro');
          return;
        }
        alert('Registro actualizado exitosamente');
      } else {
        const res = await api.createExonerado(formData);
        if (!res?.success) {
          alert(res?.error || 'Error al guardar el registro');
          return;
        }
        alert('Registro guardado exitosamente');
      }

      await loadExonerados();

      // Limpiar formulario
      setFormData({
        code: '',
        apellido: '',
        nombre: '',
        cedula: '',
        universidadTsu: '',
        fechaServicio: '',
        titulo: '',
        observaciones: '',
        razonExoneracion: '',
        proyectoTitulo: '',
        proyectoCodigo: ''
      });
      setEditando(false);
      setEditId(null);

    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error al guardar el registro');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;
    if (name === 'cedula') {
      nextValue = onlyDigits(value);
    }
    setFormData({
      ...formData,
      [name]: nextValue,
    });
  };

  const handleEditar = (exonerado) => {
    setFormData(exonerado);
    setEditando(true);
    setEditId(exonerado._id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEliminar = async (id) => {
    if (window.confirm('¿Está seguro de eliminar este registro?')) {
      try {
        const res = await api.deleteExonerado(id);
        if (!res?.success) {
          alert(res?.error || 'Error al eliminar el registro');
          return;
        }
        await loadExonerados();
        alert('Registro eliminado');
      } catch (error) {
        console.error('Error al eliminar:', error);
        alert('Error al eliminar el registro');
      }
    }
  };

  const exportarCSV = () => {
    const headers = ['Código', 'Apellido', 'Nombre', 'Cédula', 'Universidad/TSU', 'Año Servicio', 'Título', 'Razón', 'Proyecto', 'Código Proyecto', 'Observaciones', 'Fecha Registro'];
    
    const rows = exonerados.map(item => [
      item.code,
      item.apellido,
      item.nombre,
      item.cedula,
      item.universidadTsu,
      item.fechaServicio,
      item.titulo,
      item.razonExoneracion,
      item.proyectoTitulo,
      item.proyectoCodigo,
      item.observaciones,
      item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `exonerados_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const loadImportHistory = async () => {
    if (!api.getImportHistory) return;
    try {
      const res = await api.getImportHistory('exonerados');
      const imports = res?.success ? res.imports ?? [] : [];
      const filtered = imports.filter((item) => item && item.summary && typeof item.summary.created === 'number');
      setImportHistory(filtered);
    } catch (error) {
      console.error('Error al cargar historial de importaciones:', error);
      setImportHistory([]);
    }
  };

  const handleImportFileChange = (e) => {
    setImportResult(null);
    setImportError('');
    const file = e.target.files && e.target.files[0];
    setImportFilePath(file ? file.path || '' : '');
  };

  const handleImport = async () => {
    if (!api.importExonerados) {
      setImportError('La importacion no esta disponible en esta version.');
      return;
    }
    if (!importFilePath) {
      setImportError('Selecciona un archivo antes de importar');
      return;
    }

    try {
      setImportLoading(true);
      setImportError('');
      const res = await api.importExonerados(importFilePath);
      setImportResult(res);
      await loadImportHistory();
      await loadExonerados();
    } catch (error) {
      setImportError(error?.message || 'Error al importar el archivo');
    } finally {
      setImportLoading(false);
    }
  };

  const handleClearImportHistory = async () => {
    if (!confirm('Eliminar todo el historial de importaciones?')) return;
    try {
      await api.clearImportHistory('exonerados');
      await loadImportHistory();
    } catch (error) {
      console.error('Error al limpiar historial de importaciones:', error);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-lg mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Registro de Exonerados</h1>
            <p className="text-blue-100 mt-2">Registro de estudiantes exonerados del servicio comunitario</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="bg-white rounded-xl shadow-lg border border-blue-100 p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">
            {editando ? 'Editar Exonerado' : 'Nuevo Registro'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Código (auto-generado si se deja vacío)
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="EX-001"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cédula *
                </label>
                <input
                  type="text"
                  name="cedula"
                  value={formData.cedula}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Apellido *
                </label>
                <input
                  type="text"
                  name="apellido"
                  value={formData.apellido}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Universidad / TSU *
              </label>
              <input
                type="text"
                name="universidadTsu"
                value={formData.universidadTsu}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Razón de exoneración
                </label>
                <textarea
                  name="razonExoneracion"
                  value={formData.razonExoneracion}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Motivo de la exoneración"
                />
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Año del Servicio Comunitario
                </label>
                <input
                  type="number"
                  name="fechaServicio"
                  value={formData.fechaServicio}
                  onChange={handleChange}
                  min="2000"
                  max="2100"
                  placeholder="2024"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Título Obtenido
                </label>
                <select
                  name="titulo"
                  value={formData.titulo}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar título</option>
                  <option value="TSU">Técnico Superior Universitario (TSU)</option>
                  <option value="Ingeniero">Ingeniero</option>
                  <option value="Licenciado">Licenciado</option>
                  <option value="Doctor">Doctor</option>
                  <option value="Magister">Magister</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Proyecto (título)
                </label>
                <input
                  type="text"
                  name="proyectoTitulo"
                  value={formData.proyectoTitulo}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Código de proyecto
                </label>
                <input
                  type="text"
                  name="proyectoCodigo"
                  value={formData.proyectoCodigo}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Observaciones
              </label>
              <textarea
                name="observaciones"
                value={formData.observaciones}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>


            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition duration-200 flex-1"
              >
                {editando ? 'Actualizar' : 'Guardar Registro'}
              </button>
              
              {editando && (
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      code: '',
                      apellido: '',
                      nombre: '',
                      cedula: '',
                      universidadTsu: '',
                      fechaServicio: '',
                      titulo: '',
                      observaciones: '',
                      razonExoneracion: '',
                      proyectoTitulo: '',
                      proyectoCodigo: '',
                    });
                    setEditando(false);
                    setEditId(null);
                  }}
                  className="px-4 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition duration-200"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-blue-100 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">Registros Guardados</h2>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                className="w-full sm:w-64 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Buscar exonerado"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button
                type="button"
                onClick={() => {
                  setShowImport(true);
                  loadImportHistory();
                }}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm"
              >
                Importar
              </button>
              <button
                onClick={exportarCSV}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                disabled={exonerados.length === 0}
              >
                Exportar CSV
              </button>
            </div>
          </div>

          {filteredExonerados.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No hay registros para el filtro actual</p>
              <p className="text-sm mt-1">Comience agregando un nuevo exonerado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-blue-50">
                    <th className="py-2 px-3 text-left">Código</th>
                    <th className="py-2 px-3 text-left">Apellido, Nombre</th>
                    <th className="py-2 px-3 text-left">Cédula</th>
                    <th className="py-2 px-3 text-left">Universidad</th>
                    <th className="py-2 px-3 text-left">Razón</th>
                    <th className="py-2 px-3 text-left">Proyecto</th>
                    <th className="py-2 px-3 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedExonerados.map((item) => (
                    <tr key={item._id} className="border-b hover:bg-blue-50">
                      <td className="py-2 px-3 font-mono text-xs">{item.code}</td>
                      <td className="py-2 px-3">{item.apellido}, {item.nombre}</td>
                      <td className="py-2 px-3">{item.cedula}</td>
                      <td className="py-2 px-3">{item.universidadTsu}</td>
                      <td className="py-2 px-3">{item.razonExoneracion || '—'}</td>
                      <td className="py-2 px-3">{item.proyectoTitulo || item.proyectoCodigo || '—'}</td>
                      <td className="py-2 px-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditar(item)}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleEliminar(item._id)}
                            className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 text-sm text-slate-600">
                Total: {filteredExonerados.length} registro(s) • Pagina {currentPage} de {totalPages}
              </div>
              {totalPages > 1 && (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    className="px-3 py-1 border rounded"
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </button>
                  {buildPageItems(totalPages, currentPage).map((page, index) =>
                    page === '...'
                      ? (
                        <span key={`ellipsis-${index}`} className="px-2 text-slate-500">...</span>
                      )
                      : (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 rounded ${page === currentPage ? 'bg-blue-600 text-white' : 'border'}`}
                        >
                          {page}
                        </button>
                      )
                  )}
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    className="px-3 py-1 border rounded"
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showImport && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-3">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Importar exonerados</h3>
              <button
                type="button"
                onClick={() => setShowImport(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-sm text-slate-600 mb-2">Selecciona el archivo Excel o CSV con los registros de exonerados.</p>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFileChange} className="mb-3" />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={importLoading}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {importLoading ? 'Importando...' : 'Importar'}
                </button>
                <div className="text-xs text-slate-500 break-all">{importFilePath}</div>
              </div>
              {importError && <div className="mt-3 text-red-600 text-sm">{importError}</div>}
            </div>

            {importResult && (
              <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-sm text-green-800">
                Importacion completa: {importResult?.results?.created || 0} registros, {importResult?.results?.errors?.length || 0} errores.
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-700">Historial de importaciones</h4>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={loadImportHistory}
                    className="px-3 py-1 text-xs border rounded"
                  >
                    Refrescar
                  </button>
                  <button
                    type="button"
                    onClick={handleClearImportHistory}
                    className="px-3 py-1 text-xs bg-red-600 text-white rounded"
                  >
                    Limpiar
                  </button>
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                {importHistory.length === 0 ? (
                  <p className="text-xs text-slate-500">No hay importaciones registradas.</p>
                ) : (
                  <ul className="space-y-2">
                    {importHistory.map((item) => (
                      <li key={item._id} className="text-xs text-slate-600 flex items-center justify-between">
                        <div>
                          <div className="font-medium text-slate-700">{item.fileName || 'Archivo sin nombre'}</div>
                          <div>{new Date(item.importedAt).toLocaleString()}</div>
                        </div>
                        <div>
                          {item.summary
                            ? `${item.summary.created ?? item.summary.createdProjects ?? 0} registros • ${item.summary.errors || 0} errores`
                            : ''}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExoneradoPage;