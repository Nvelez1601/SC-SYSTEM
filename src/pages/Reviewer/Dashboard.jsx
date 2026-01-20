import React, { useEffect, useMemo, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import ProjectsPage from '../Projects/Projects';
import DashboardLayout from '../../components/DashboardLayout';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
};

const normalizeMemberDisplay = (project) => {
  if (!project) return 'Sin registro';
  const member1 = [project.member1FirstNames, project.member1LastNames].filter(Boolean).join(' ')
    || [project.studentFirstNames, project.studentLastNames].filter(Boolean).join(' ');
  const member2 = [project.member2FirstNames, project.member2LastNames].filter(Boolean).join(' ');
  return [member1, member2].filter(Boolean).join(' · ') || 'Sin registro';
};

const toCsvValue = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[,"\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

function DeliveryCard({ d, project, notes, onNotesChange, onApprove, onReject, onOpenProject }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 mb-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">{d.title || `Entrega ${d.deliveryNumber}`}</h3>
          <p className="text-sm text-slate-600">Proyecto: {project?.title || 'Sin título'}</p>
          <p className="text-sm text-slate-600">Código: {project?.rowNumber || project?.projectCode || 'N/A'}</p>
          <p className="text-sm text-slate-600">Integrantes: {normalizeMemberDisplay(project)}</p>
          <p className="text-sm text-slate-600">Enviado: {formatDate(d.submittedAt)}</p>
          <p className="text-sm text-slate-600">Estatus: {d.status || 'pendiente'}</p>
        </div>
        <div className="space-x-2">
          <button
            onClick={() => onOpenProject(d.projectId)}
            className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-100"
          >
            Ver proyecto
          </button>
          <button onClick={() => onApprove(d._id)} className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700">Aprobar</button>
          <button onClick={() => onReject(d._id)} className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700">Rechazar</button>
        </div>
      </div>
      <div className="mt-3">
        <label className="text-xs text-slate-500">Observaciones</label>
        <textarea
          className="w-full border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={2}
          value={notes}
          onChange={(e) => onNotesChange(d._id, e.target.value)}
          placeholder="Notas para la aprobación o rechazo"
        />
      </div>
      {d.reviewComments && <p className="mt-2 text-sm text-slate-700">Comentarios: {d.reviewComments}</p>}
    </div>
  );
}

export function ReviewerHome({ user, onLogout }) {
  const [deliveries, setDeliveries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [deliveryFilter, setDeliveryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [reviewNotes, setReviewNotes] = useState({});
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const [pendingRes, projectsRes] = await Promise.all([
        window.electronAPI.getPendingDeliveries?.(),
        window.electronAPI.getAllProjects?.(),
      ]);

      const pending = pendingRes?.deliveries || [];
      const projectsList = projectsRes?.projects || [];

      setDeliveries(pending);
      setProjects(projectsList);
    } catch (err) {
      console.error('Failed to load pending deliveries', err);
      setDeliveries([]);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (deliveryId) => {
    try {
      let reviewerId = user && user._id;
      if (!reviewerId) {
        try {
          const cur = await window.electronAPI.getCurrentUser();
          if (cur && cur.user && cur.user._id) reviewerId = cur.user._id;
        } catch (_) {}
      }

      const notes = (reviewNotes[deliveryId] || '').trim();
      const res = await window.electronAPI.reviewDelivery(deliveryId, reviewerId, 'approve', notes);
      if (res && res.success) {
        setReviewNotes((prev) => {
          const next = { ...prev };
          delete next[deliveryId];
          return next;
        });
        loadData();
      }
      else console.error('Approve failed', res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (deliveryId) => {
    try {
      let reviewerId = user && user._id;
      if (!reviewerId) {
        try {
          const cur = await window.electronAPI.getCurrentUser();
          if (cur && cur.user && cur.user._id) reviewerId = cur.user._id;
        } catch (_) {}
      }

      const notes = (reviewNotes[deliveryId] || '').trim();
      if (!notes) {
        alert('Debes agregar un motivo para rechazar la entrega.');
        return;
      }
      const res = await window.electronAPI.reviewDelivery(deliveryId, reviewerId, 'reject', notes);
      if (res && res.success) {
        setReviewNotes((prev) => {
          const next = { ...prev };
          delete next[deliveryId];
          return next;
        });
        loadData();
      }
      else console.error('Reject failed', res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenProject = (projectId) => {
    if (!projectId) return;
    navigate('/reviewer/projects', { state: { openProjectId: projectId } });
  };

  const projectMap = useMemo(() => {
    return new Map(projects.map((project) => [project._id, project]));
  }, [projects]);

  const allDeliveries = useMemo(() => {
    const list = [];
    projects.forEach((project) => {
      (project.deliveries || []).forEach((delivery) => {
        list.push({ ...delivery, projectId: delivery.projectId || project._id });
      });
    });
    return list.length ? list : deliveries;
  }, [projects, deliveries]);

  const filteredDeliveries = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo) : null;

    return allDeliveries.filter((delivery) => {
      const status = delivery.status || 'pending';
      if (statusFilter && status !== statusFilter) return false;
      if (deliveryFilter && Number(deliveryFilter) !== Number(delivery.deliveryNumber)) return false;

      const baseDate = delivery.reviewedAt || delivery.submittedAt;
      if (from && (!baseDate || new Date(baseDate) < from)) return false;
      if (to && (!baseDate || new Date(baseDate) > to)) return false;

      if (!term) return true;
      const project = projectMap.get(delivery.projectId);
      const members = normalizeMemberDisplay(project).toLowerCase();
      return [project?.title, project?.rowNumber, project?.projectCode, members, delivery.title]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [allDeliveries, searchTerm, statusFilter, deliveryFilter, dateFrom, dateTo, projectMap]);

  const metrics = useMemo(() => {
    const total = allDeliveries.length;
    const approved = allDeliveries.filter((delivery) => delivery.status === 'approved').length;
    const rejected = allDeliveries.filter((delivery) => delivery.status === 'rejected').length;
    const pending = allDeliveries.filter((delivery) => ['pending', 'in_review'].includes(delivery.status)).length;
    return { total, approved, rejected, pending };
  }, [allDeliveries]);

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
        <h1 className="text-2xl sm:text-3xl font-semibold">Panel del revisor</h1>
        <p className="text-sm text-blue-100">Revisa entregas pendientes, aplica filtros y exporta reportes.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Pendientes" value={metrics.pending} />
        <StatCard title="Aprobadas" value={metrics.approved} />
        <StatCard title="Rechazadas" value={metrics.rejected} />
        <StatCard title="Total entregas" value={metrics.total} />
      </div>

      <SectionCard title="Filtros" subtitle="Busca por proyecto, integrante o rango de fechas.">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Buscar por proyecto o integrante"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="pending">Pendientes</option>
            <option value="in_review">En revisión</option>
            <option value="approved">Aprobadas</option>
            <option value="rejected">Rechazadas</option>
            <option value="">Todas</option>
          </select>
          <select
            className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={deliveryFilter}
            onChange={(e) => setDeliveryFilter(e.target.value)}
          >
            <option value="">Todas las entregas</option>
            <option value="1">Entrega 1</option>
            <option value="2">Entrega 2</option>
            <option value="3">Entrega 3</option>
          </select>
          <input
            type="date"
            className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <input
            type="date"
            className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </SectionCard>

      <SectionCard title="Exportar proyectos (CSV)" subtitle="Filtra por fecha de creación del proyecto.">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="date"
            className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={exportFrom}
            onChange={(e) => setExportFrom(e.target.value)}
          />
          <input
            type="date"
            className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={exportTo}
            onChange={(e) => setExportTo(e.target.value)}
          />
          <button
            type="button"
            onClick={handleExport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Exportar CSV
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Entregas" subtitle="Revisa el estado de cada entrega.">
        {loading ? (
          <div className="text-sm text-slate-500">Cargando...</div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="text-sm text-slate-500">No hay entregas para los filtros seleccionados.</div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto pr-2">
            {filteredDeliveries.map((delivery) => (
              <DeliveryCard
                key={delivery._id}
                d={delivery}
                project={projectMap.get(delivery.projectId)}
                notes={reviewNotes[delivery._id] || ''}
                onNotesChange={(id, value) =>
                  setReviewNotes((prev) => ({
                    ...prev,
                    [id]: value,
                  }))
                }
                onApprove={handleApprove}
                onReject={handleReject}
                onOpenProject={handleOpenProject}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

export default function ReviewerDashboard({ user, onLogout }) {
  const links = [
    { to: '', label: 'Panel' },
    { to: 'projects', label: 'Proyectos' },
  ];

  const logoutHandler = async () => {
    // prefer App-level logout handler so App state is cleared
    if (typeof onLogout === 'function') {
      try {
        await onLogout();
      } catch (e) {
        console.error('onLogout failed, falling back to direct logout', e);
        if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.logout) {
          await window.electronAPI.logout();
        }
      }
    } else {
      if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.logout) {
        await window.electronAPI.logout();
      }
    }
  };

  return (
    <DashboardLayout user={user} title="Revisor" links={links} onLogout={logoutHandler}>
      <Routes>
        <Route path="" element={<ReviewerHome user={user} onLogout={onLogout} />} />
        <Route path="projects" element={<ProjectsPage user={user} onLogout={logoutHandler} />} />
      </Routes>
    </DashboardLayout>
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
