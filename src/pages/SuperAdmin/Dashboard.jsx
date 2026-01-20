import React, { useMemo, useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import UserManagement from './UserManagement';
import ProjectsPage from '../Projects/Projects';
import ImportPage from '../Projects/Import';
import DashboardLayout from '../../components/DashboardLayout';
import ExoneradoPage from '../exonerado/exonerados.pages';


ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function Dashboard({ user, onLogout }) {
  const links = [
    { to: '', label: 'Panel' },
    { to: 'projects', label: 'Proyectos' },
    { to: 'projects/import', label: 'Importar' },
    { to: 'users', label: 'Gestión de usuarios' },
    { to: 'exonerado', label: 'Exonerado' },
  ];

  const logoutHandler = () => {
    if (onLogout) onLogout();
  };

  return (
    <DashboardLayout user={user} title="Súper Admin" links={links} onLogout={logoutHandler}>
      {/* nested routes are provided via Outlet in DashboardLayout */}
      <Routes>
        <Route path="" element={<DashboardHome user={user} />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="projects" element={<ProjectsPage user={user} onLogout={onLogout} />} />
        <Route path="projects/import" element={<ImportPage user={user} onLogout={onLogout} />} />
        <Route path="exonerado" element={<ExoneradoPage />} />
      </Routes>
    </DashboardLayout>
  );
}

function DashboardHome({ user }) {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [usersRes, projectsRes] = await Promise.all([
        window.electronAPI.getAllUsers({}),
        window.electronAPI.getAllProjects?.(),
      ]);
      setUsers(usersRes?.users || []);
      setProjects(projectsRes?.projects || []);
    } catch (error) {
      console.error('Error loading stats:', error);
      setUsers([]);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const userSignature = (userItem) => {
    if (!userItem) return 'desconocido';
    const fullName = [userItem.firstName, userItem.lastName].filter(Boolean).join(' ').trim();
    return fullName || userItem.username || userItem.email || 'desconocido';
  };

  const usersById = useMemo(() => new Map(users.map((u) => [u._id, u])), [users]);
  const usersBySignature = useMemo(
    () => new Map(users.map((u) => [userSignature(u), u])),
    [users]
  );

  const deliveries = useMemo(() => {
    const list = [];
    projects.forEach((project) => {
      (project.deliveries || []).forEach((delivery) => {
        list.push({ ...delivery, projectId: delivery.projectId || project._id });
      });
    });
    return list;
  }, [projects]);

  const userStats = useMemo(() => {
    const totalUsers = users.length;
    const totalAdmins = users.filter((u) => u.role === 'admin').length;
    const totalReviewers = users.filter((u) => u.role === 'reviewer').length;
    const totalStudents = users.filter((u) => u.role === 'student').length;
    return { totalUsers, totalAdmins, totalReviewers, totalStudents };
  }, [users]);

  const projectStats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((project) => project.status === 'active').length;
    const completed = projects.filter((project) => project.status === 'completed').length;
    const expired = projects.filter((project) => project.status === 'expired').length;
    const draft = projects.filter((project) => project.status === 'draft').length;
    return { total, active, completed, expired, draft };
  }, [projects]);

  const deliveryStats = useMemo(() => {
    const total = deliveries.length;
    const approved = deliveries.filter((delivery) => delivery.status === 'approved').length;
    const rejected = deliveries.filter((delivery) => delivery.status === 'rejected').length;
    const pending = deliveries.filter((delivery) => !['approved', 'rejected'].includes(delivery.status)).length;
    return { total, approved, rejected, pending };
  }, [deliveries]);

  const agentStats = useMemo(() => {
    const statsMap = new Map();

    const ensureAgent = (key, name) => {
      if (!statsMap.has(key)) {
        statsMap.set(key, {
          key,
          name,
          deliveriesApproved: 0,
          deliveriesRejected: 0,
          deliveriesPending: 0,
          deliveriesTotal: 0,
          projectsApproved: 0,
        });
      }
      return statsMap.get(key);
    };

    deliveries.forEach((delivery) => {
      const reviewer = delivery.reviewerId ? usersById.get(delivery.reviewerId) : null;
      const name = reviewer ? userSignature(reviewer) : 'Sin asignar';
      const key = reviewer ? `user:${reviewer._id}` : 'user:unassigned';
      const agent = ensureAgent(key, name);

      agent.deliveriesTotal += 1;
      if (delivery.status === 'approved') {
        agent.deliveriesApproved += 1;
      } else if (delivery.status === 'rejected') {
        agent.deliveriesRejected += 1;
      } else {
        agent.deliveriesPending += 1;
      }
    });

    projects.forEach((project) => {
      const approver = (project.approvedBy || '').trim();
      if (!approver) return;
      const userMatch = usersBySignature.get(approver);
      const key = userMatch ? `user:${userMatch._id}` : `name:${approver}`;
      const name = userMatch ? userSignature(userMatch) : approver;
      const agent = ensureAgent(key, name);
      agent.projectsApproved += 1;
    });

    return Array.from(statsMap.values()).sort((a, b) => {
      if (b.deliveriesTotal !== a.deliveriesTotal) return b.deliveriesTotal - a.deliveriesTotal;
      return b.projectsApproved - a.projectsApproved;
    });
  }, [deliveries, projects, usersById, usersBySignature]);

  const topAgents = useMemo(() => agentStats.slice(0, 8), [agentStats]);

  const deliveryChartData = useMemo(
    () => ({
      labels: topAgents.map((agent) => agent.name),
      datasets: [
        {
          label: 'Aprobadas',
          data: topAgents.map((agent) => agent.deliveriesApproved),
          backgroundColor: 'rgba(37, 99, 235, 0.85)',
          borderRadius: 6,
        },
        {
          label: 'Rechazadas',
          data: topAgents.map((agent) => agent.deliveriesRejected),
          backgroundColor: 'rgba(96, 165, 250, 0.9)',
          borderRadius: 6,
        },
        {
          label: 'Pendientes',
          data: topAgents.map((agent) => agent.deliveriesPending),
          backgroundColor: 'rgba(191, 219, 254, 0.9)',
          borderRadius: 6,
        },
      ],
    }),
    [topAgents]
  );

  const deliveryChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#334155' },
        },
      },
      scales: {
        x: { stacked: true, ticks: { color: '#64748b' } },
        y: { stacked: true, ticks: { color: '#64748b' } },
      },
    }),
    []
  );

  const projectsChartData = useMemo(
    () => ({
      labels: topAgents.map((agent) => agent.name),
      datasets: [
        {
          label: 'Proyectos aprobados',
          data: topAgents.map((agent) => agent.projectsApproved),
          backgroundColor: 'rgba(59, 130, 246, 0.75)',
          borderRadius: 6,
        },
      ],
    }),
    [topAgents]
  );

  const projectsChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#334155' } },
      },
      scales: {
        x: { ticks: { color: '#64748b' } },
        y: { ticks: { color: '#64748b' } },
      },
    }),
    []
  );

  const toCsvValue = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    if (/[,"\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const handleExport = () => {
    const from = exportFrom ? new Date(exportFrom) : null;
    const to = exportTo ? new Date(exportTo) : null;

    const rows = projects.filter((project) => {
      const createdAt = project.createdAt ? new Date(project.createdAt) : null;
      if (from && (!createdAt || createdAt < from)) return false;
      if (to && (!createdAt || createdAt > to)) return false;
      return true;
    });

    const headers = [
      'No.',
      'NOMBRES',
      'APELLIDOS',
      'CÉDULA',
      'SEMESTRE',
      'TITULO TC',
      'COMUNIDAD',
      'CAJA Nº',
      'INTEGRANTE 2 NOMBRES',
      'INTEGRANTE 2 APELLIDOS',
      'INTEGRANTE 2 CÉDULA',
      'CÓDIGO DE PROYECTO',
    ];

    const body = rows.map((project) => [
      project.rowNumber || project.projectCode || '',
      project.member1FirstNames || project.studentFirstNames || '',
      project.member1LastNames || project.studentLastNames || '',
      project.member1Document || project.studentDocument || '',
      project.semester || '',
      project.title || '',
      project.community || '',
      project.boxNumber || project.certificateNumber || '',
      project.member2FirstNames || '',
      project.member2LastNames || '',
      project.member2Document || '',
      project.projectCode || project.rowNumber || '',
    ]);

    const csv = [headers, ...body].map((row) => row.map(toCsvValue).join(',')).join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `proyectos_${exportFrom || 'inicio'}_${exportTo || 'hoy'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400 p-6 text-white shadow-lg">
        <h1 className="text-2xl sm:text-3xl font-semibold">Panel del Súper Admin</h1>
        <p className="text-sm text-blue-100">Resumen general del sistema y desempeño de agentes.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Usuarios totales" value={userStats.totalUsers} />
        <StatCard title="Administradores" value={userStats.totalAdmins} />
        <StatCard title="Revisores" value={userStats.totalReviewers} />
        <StatCard title="Estudiantes" value={userStats.totalStudents} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Proyectos" value={projectStats.total} />
        <StatCard title="Activos" value={projectStats.active} />
        <StatCard title="Completados" value={projectStats.completed} />
        <StatCard title="Expirados" value={projectStats.expired} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Entregas" value={deliveryStats.total} />
        <StatCard title="Aprobadas" value={deliveryStats.approved} />
        <StatCard title="Rechazadas" value={deliveryStats.rejected} />
        <StatCard title="Pendientes" value={deliveryStats.pending} />
      </div>

      <SectionCard title="Exportar proyectos (CSV)" subtitle="Filtra por fecha de creación del proyecto.">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="date"
            className="border border-blue-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={exportFrom}
            onChange={(e) => setExportFrom(e.target.value)}
          />
          <input
            type="date"
            className="border border-blue-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={exportTo}
            onChange={(e) => setExportTo(e.target.value)}
          />
          <button
            type="button"
            onClick={handleExport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            disabled={loading}
          >
            Exportar CSV
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Revisiones por agente" subtitle="Entregas revisadas por cada agente (aprobadas, rechazadas y pendientes).">
        {loading ? (
          <p className="text-sm text-slate-500">Cargando métricas...</p>
        ) : topAgents.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no hay revisiones registradas.</p>
        ) : (
          <div className="h-72">
            <Bar data={deliveryChartData} options={deliveryChartOptions} />
          </div>
        )}
      </SectionCard>

      <SectionCard title="Proyectos aprobados por agente" subtitle="Comparativo de aprobaciones por agente.">
        {loading ? (
          <p className="text-sm text-slate-500">Cargando métricas...</p>
        ) : topAgents.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no hay aprobaciones registradas.</p>
        ) : (
          <div className="h-64">
            <Bar data={projectsChartData} options={projectsChartOptions} />
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="bg-gradient-to-br from-white via-blue-50 to-white border border-blue-100 rounded-2xl shadow-sm p-4">
      <p className="text-xs uppercase tracking-wide text-blue-600 mb-1">{title}</p>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SectionCard({ title, subtitle, children }) {
  return (
    <div className="bg-white/90 backdrop-blur border border-blue-100 rounded-2xl shadow-md p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export default Dashboard;
