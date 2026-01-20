import React, { useState, useEffect } from 'react';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI.getAllUsers({});
      if (result.success) {
        setUsers(result.users);
      } else {
        setError(result.error || 'No se pudieron cargar los usuarios');
      }
    } catch (error) {
      setError('Ocurrió un error al cargar los usuarios');
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (userData) => {
    try {
      const result = await window.electronAPI.createUser(userData);
      if (result.success) {
        setSuccess('Usuario creado correctamente');
        setShowCreateModal(false);
        loadUsers();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'No se pudo crear el usuario');
      }
    } catch (error) {
      setError('Ocurrió un error al crear el usuario');
      console.error('Error creating user:', error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('¿Seguro que deseas eliminar este usuario?')) {
      return;
    }

    try {
      const result = await window.electronAPI.deleteUser(userId);
      if (result.success) {
        setSuccess('Usuario eliminado correctamente');
        loadUsers();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'No se pudo eliminar el usuario');
      }
    } catch (error) {
      setError('Ocurrió un error al eliminar el usuario');
      console.error('Error deleting user:', error);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de usuarios</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Crear usuario
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          {success}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Cargando usuarios...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Correo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user._id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedUser(user)}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.username}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {user.role !== 'super_admin' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteUser(user._id); }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateUser}
        />
      )}

      {selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={async (updated) => {
            try {
              console.log('[UserManagement] updating user', updated._id, updated);
              const res = await window.electronAPI.updateUser(updated._id, updated);
              if (res && res.success) {
                setSelectedUser(null);
                loadUsers();
              } else {
                alert(res.error || 'No se pudo actualizar el usuario');
              }
            } catch (err) {
              console.error('Update user error', err);
              alert('Error inesperado al actualizar el usuario');
            }
          }}
          onDelete={async (id) => {
            try {
              const res = await window.electronAPI.deleteUser(id);
              if (res && res.success) {
                setSelectedUser(null);
                loadUsers();
              } else {
                alert(res.error || 'No se pudo eliminar el usuario');
              }
            } catch (err) {
              console.error('Delete user error', err);
              alert('Error inesperado al eliminar el usuario');
            }
          }}
        />
      )}
    </div>
  );
}

function CreateUserModal({ onClose, onCreate }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    role: 'admin',
    firstName: '',
    lastName: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Crear usuario</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Usuario</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Correo</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Rol</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="admin">Administrador</option>
              <option value="reviewer">Revisor</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Apellido</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Crear usuario
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditUserModal({ user, onClose, onUpdate, onDelete }) {
  const [formData, setFormData] = useState({ ...user });

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Editar usuario</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="block text-sm mb-1">Usuario</label>
            <input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full border p-2 rounded" />
          </div>
          <div className="mb-3">
            <label className="block text-sm mb-1">Correo</label>
            <input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border p-2 rounded" />
          </div>
          <div className="mb-3">
            <label className="block text-sm mb-1">Rol</label>
            <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full border p-2 rounded">
              <option value="admin">Administrador</option>
              <option value="reviewer">Revisor</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm mb-1">Estado</label>
            <select value={formData.active ? 'active' : 'inactive'} onChange={e => setFormData({...formData, active: e.target.value === 'active'})} className="w-full border p-2 rounded">
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => onDelete(user._id)} className="px-4 py-2 border rounded text-red-600">Eliminar</button>
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function getRoleLabel(role) {
  switch (role) {
    case 'super_admin':
      return 'Súper Admin';
    case 'admin':
      return 'Administrador';
    case 'reviewer':
      return 'Revisor';
    case 'student':
      return 'Estudiante';
    default:
      return role;
  }
}

function getRoleBadgeColor(role) {
  switch (role) {
    case 'super_admin':
      return 'bg-red-100 text-red-800';
    case 'admin':
      return 'bg-blue-100 text-blue-800';
    case 'reviewer':
      return 'bg-purple-100 text-purple-800';
    case 'student':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default UserManagement;
