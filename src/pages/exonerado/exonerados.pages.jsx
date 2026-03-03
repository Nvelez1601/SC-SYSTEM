import React, { useEffect, useState } from 'react';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validación básica
    if (!formData.apellido || !formData.nombre || !formData.cedula) {
      alert('Por favor complete los campos obligatorios (*)');
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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-lg mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Registro de Exonerados</h1>
        <p className="text-blue-100 mt-2">Registro de estudiantes exonerados del servicio comunitario</p>
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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800">Registros Guardados</h2>
            <button
              onClick={exportarCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
              disabled={exonerados.length === 0}
            >
              Exportar CSV
            </button>
          </div>

          {exonerados.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No hay registros guardados</p>
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
                  {exonerados.map((item, index) => (
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
                Total: {exonerados.length} registro(s)
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-blue-100 shadow">
          <p className="text-sm text-blue-600">Total Registros</p>
          <p className="text-2xl font-bold">{exonerados.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-blue-100 shadow">
          <p className="text-sm text-blue-600">Último Registro</p>
          <p className="text-lg font-semibold">
            {exonerados.length > 0 ? 
              new Date(exonerados[exonerados.length-1].createdAt).toLocaleDateString() : 
              'N/A'}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-blue-100 shadow">
          <p className="text-sm text-blue-600">Por Título</p>
          <p className="text-lg font-semibold">
            {[...new Set(exonerados.map(item => item.titulo))].filter(Boolean).length} tipos
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-blue-100 shadow">
          <p className="text-sm text-blue-600">Exportar</p>
          <button
            onClick={exportarCSV}
            className="mt-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            disabled={exonerados.length === 0}
          >
            Descargar CSV
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExoneradoPage;