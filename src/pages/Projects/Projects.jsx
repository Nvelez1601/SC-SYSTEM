import React, { useEffect, useState } from 'react';

export default function ProjectsPage({ user }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ projectCode: '', title: '', description: '' });
  const [selectedProject, setSelectedProject] = useState(null);

  const loadProjects = async () => {
    setLoading(true);
    try {
      if (window.electronAPI && window.electronAPI.getAllProjects) {
        const res = await window.electronAPI.getAllProjects();
        if (res && res.success) setProjects(res.projects || []);
        else setProjects([]);
      } else {
        setProjects([]);
      }
    } catch (err) {
      console.error('Failed to load projects', err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      if (!window.electronAPI || !window.electronAPI.createProject) {
        alert('Create project is not wired in main process yet');
        return;
      }
      console.log('[ProjectsPage] creating project', form);
      const res = await window.electronAPI.createProject(form);
      if (res && res.success) {
        setShowCreate(false);
        setForm({ projectCode: '', title: '', description: '' });
        loadProjects();
      } else {
        alert(res.error || 'Failed to create project');
      }
    } catch (err) {
      console.error('Create project error', err);
      alert('Unexpected error creating project');
    }
  };

  const openEdit = (project) => {
    setSelectedProject({ ...project });
  };

  const closeEdit = () => {
    setSelectedProject(null);
  };

  const handleUpdate = async (e) => {
    e && e.preventDefault();
    if (!selectedProject) return;
    try {
      console.log('[ProjectsPage] updating project', selectedProject._id, selectedProject);
      if (!window.electronAPI || !window.electronAPI.updateProject) {
        throw new Error('IPC method updateProject not available');
      }
      const res = await window.electronAPI.updateProject(selectedProject._id, selectedProject);
      if (res && res.success) {
        closeEdit();
        loadProjects();
      } else {
        alert(res.error || 'Failed to update project');
      }
    } catch (err) {
      console.error('Update project error', err);
      if (err && typeof err.message === 'string' && err.message.includes('No handler registered')) {
        alert('IPC handler for project:update no está registrado. Por favor reinicia la aplicación para cargar handlers del main.');
      } else if (err && err.message === 'IPC method updateProject not available') {
        alert('La API IPC `updateProject` no está disponible en preload. Reinicia la app o verifica preload.js');
      } else {
        alert('Unexpected error updating project');
      }
    }
  };

  const handleDelete = async (projectId) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      console.log('[ProjectsPage] deleting project', projectId);
      const res = await window.electronAPI.deleteProject(projectId);
      if (res && res.success) {
        loadProjects();
      } else {
        alert(res.error || 'Failed to delete project');
      }
    } catch (err) {
      console.error('Delete project error', err);
      alert('Unexpected error deleting project');
    }
  };

  const handleApprove = async () => {
    if (!selectedProject) return;
    // only set local status, do not auto-save or close modal
    setSelectedProject(prev => ({ ...prev, status: 'approved' }));
  };

  const handleReject = async () => {
    if (!selectedProject) return;
    // only set local status, do not auto-save or close modal
    setSelectedProject(prev => ({ ...prev, status: 'rejected' }));
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <div>
          <button onClick={() => setShowCreate(true)} className="px-3 py-1 bg-blue-600 text-white rounded">New Project</button>
        </div>
      </div>

      {loading ? (
        <div>Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="text-gray-600">No projects found.</div>
      ) : (
        <div className="grid gap-4">
          {projects.map(p => (
            <div key={p._id} className="bg-white p-4 rounded shadow cursor-pointer" onClick={() => openEdit(p)}>
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="font-semibold">{p.projectCode} — {p.title || 'Untitled'}</h2>
                  <p className="text-sm text-gray-600">{p.description}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-500">Progress: {p.progress || 0}%</div>
                  <div>
                    {p.status ? (
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${p.status === 'approved' ? 'bg-green-100 text-green-800' : p.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                        {p.status}
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">(none)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Create Project</h2>
            <form onSubmit={handleCreate}>
              <div className="mb-3">
                <label className="block text-sm mb-1">Project Code</label>
                <input required value={form.projectCode} onChange={e => setForm({...form, projectCode: e.target.value})} className="w-full border p-2 rounded" />
              </div>
              <div className="mb-3">
                <label className="block text-sm mb-1">Title</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full border p-2 rounded" />
              </div>
              <div className="mb-4">
                <label className="block text-sm mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border p-2 rounded" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-1 border rounded">Cancel</button>
                <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-4">Edit Project</h2>
            <form onSubmit={handleUpdate}>
              <div className="mb-3">
                <label className="block text-sm mb-1">Project Code</label>
                <input required value={selectedProject.projectCode || ''} onChange={e => setSelectedProject({...selectedProject, projectCode: e.target.value})} className="w-full border p-2 rounded" />
              </div>
              <div className="mb-3">
                <label className="block text-sm mb-1">Title</label>
                <input value={selectedProject.title || ''} onChange={e => setSelectedProject({...selectedProject, title: e.target.value})} className="w-full border p-2 rounded" />
              </div>
              <div className="mb-3">
                <label className="block text-sm mb-1">Description</label>
                <textarea value={selectedProject.description || ''} onChange={e => setSelectedProject({...selectedProject, description: e.target.value})} className="w-full border p-2 rounded" />
              </div>
              <div className="mb-4">
                <label className="block text-sm mb-1">Status</label>
                <div className="p-2 border rounded bg-gray-50">{selectedProject.status || '(none)'}</div>
              </div>
              <div className="flex justify-between items-center">
                <div className="space-x-2">
                  <button type="button" onClick={handleApprove} className="px-3 py-1 bg-green-600 text-white rounded">Approve</button>
                  <button type="button" onClick={handleReject} className="px-3 py-1 bg-red-600 text-white rounded">Reject</button>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleDelete(selectedProject._id)} className="px-3 py-1 border rounded text-red-600">Delete</button>
                  <button type="button" onClick={closeEdit} className="px-3 py-1 border rounded">Cancel</button>
                  <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded">Save</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
