import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { format } from 'date-fns';

const REVIEWER_ROLES = ['super_admin', 'admin', 'reviewer'];

const deliveryStatusMeta = {
  approved: { label: 'aprobada', pill: 'bg-green-100 text-green-700' },
  in_review: { label: 'en revisión', pill: 'bg-yellow-100 text-yellow-700' },
  pending: { label: 'pendiente', pill: 'bg-gray-100 text-gray-700' },
  rejected: { label: 'rechazada', pill: 'bg-red-100 text-red-700' },
};

const getStatusMeta = (status) => deliveryStatusMeta[status] || { label: status || 'desconocido', pill: 'bg-gray-100 text-gray-700' };
const getPhaseLabel = (phase) => {
  if (Number(phase) === 1) return 'Anteproyecto';
  if (Number(phase) === 2) return 'Proyecto final';
  return `Entrega ${phase}`;
};
const getUserSignature = (user) => {
  if (!user) return '';
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return fullName || user.username || user.email || '';
};

const normalizeSemesterLabel = (value) => {
  if (!value) return '';
  const text = value.toString().trim();
  if (!text) return '';
  const match = text.match(/(\d{1,2})\s*(?:vo|ro|to|mo|no)?\.?\s*semestre/i);
  if (!match) return '';
  const number = Number(match[1]);
  if (!Number.isFinite(number) || number < 1 || number > 12) return '';
  return `${number}VO. SEMESTRE`;
};

const getMemberDisplay = (project) => {
  if (!project) return '';
  const member1 = [project.member1FirstNames, project.member1LastNames].filter(Boolean).join(' ')
    || [project.studentFirstNames, project.studentLastNames].filter(Boolean).join(' ');
  const member2 = [project.member2FirstNames, project.member2LastNames].filter(Boolean).join(' ');
  return [member1, member2].filter(Boolean).join(' · ');
};

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

const buildInfoFormFromProject = (project, userSignature) => {
  if (!project) {
    return {
      rowNumber: '',
      member1FirstNames: '',
      member1LastNames: '',
      member2FirstNames: '',
      member2LastNames: '',
      member1Document: '',
      member2Document: '',
      semester: '',
      title: '',
      description: '',
      community: '',
      boxNumber: '',
      registeredBy: userSignature || '',
    };
  }

  const fallbackMember1FirstNames = project.member1FirstNames || project.studentFirstNames || '';
  const fallbackMember1LastNames = project.member1LastNames || project.studentLastNames || '';
  const fallbackMember1Document = project.member1Document || project.studentDocument || '';

  return {
    rowNumber: project.rowNumber || '',
    member1FirstNames: fallbackMember1FirstNames,
    member1LastNames: fallbackMember1LastNames,
    member2FirstNames: project.member2FirstNames || '',
    member2LastNames: project.member2LastNames || '',
    member1Document: fallbackMember1Document,
    member2Document: project.member2Document || '',
    semester: project.semester || '',
    title: project.title || '',
    description: project.description || '',
    community: project.community || '',
    boxNumber: project.boxNumber || project.certificateNumber || '',
    registeredBy: project.registeredBy || userSignature || '',
  };
};

const initialProjectForm = {
  rowNumber: '',
  member1FirstNames: '',
  member1LastNames: '',
  member2FirstNames: '',
  member2LastNames: '',
  member1Document: '',
  member2Document: '',
  semester: '',
  title: '',
  description: '',
  community: '',
  boxNumber: '',
  registeredBy: '',
};

const initialDeliveryForm = {
  deliveryNumber: '',
  title: '',
  description: '',
  observations: '',
};

export default function ProjectsPage({ user }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [projectForm, setProjectForm] = useState({ ...initialProjectForm });
  const [selectedProject, setSelectedProject] = useState(null);
  const [anteDate, setAnteDate] = useState('');
  const [deliveryForm, setDeliveryForm] = useState({ ...initialDeliveryForm });
  const [infoForm, setInfoForm] = useState({ ...initialProjectForm });
  const [actionMessage, setActionMessage] = useState('');
  const [reviewNotes, setReviewNotes] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [boxFilter, setBoxFilter] = useState('');
  const [codeFilter, setCodeFilter] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importFilePath, setImportFilePath] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');
  const [importHistory, setImportHistory] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const location = useLocation();
  const openedProjectRef = useRef(null);
  const userSignature = useMemo(() => getUserSignature(user), [user]);
  const canReviewDeliveries = useMemo(() => REVIEWER_ROLES.includes(user?.role), [user]);
  const reviewerIdentifier = useMemo(() => user?._id || user?.username || user?.email || userSignature, [user, userSignature]);
  const canImportProjects = useMemo(() => ['super_admin', 'admin'].includes(user?.role), [user]);

  useEffect(() => {
    if (userSignature) {
      setProjectForm((prev) => ({ ...prev, registeredBy: prev.registeredBy || userSignature }));
    }
  }, [userSignature]);

  const requiredFieldLabels = {
    member1FirstNames: 'Integrante 1 - Nombres',
    member1LastNames: 'Integrante 1 - Apellidos',
    member1Document: 'Integrante 1 - Cédula',
    semester: 'Semestre',
    title: 'Título TC',
    community: 'Comunidad',
  };

  const ensureRequiredFields = (data) => {
    const missing = Object.entries(requiredFieldLabels)
      .filter(([field]) => !data[field] || !String(data[field]).trim())
      .map(([, label]) => label);

    if (missing.length) {
      alert(`Completa los siguientes campos: ${missing.join(', ')}`);
      return false;
    }

    if (!isValidVenezuelanId(data.member1Document)) {
      alert('La cédula del Integrante 1 debe ser numérica, con entre 6 y 9 dígitos y no puede ser solo ceros.');
      return false;
    }

    if (data.member2Document && !isValidVenezuelanId(data.member2Document)) {
      alert('La cédula del Integrante 2 debe ser numérica, con entre 6 y 9 dígitos y no puede ser solo ceros.');
      return false;
    }

    return true;
  };

  const getExpectedPhaseValue = (project) =>
    project?.expectedDeliveryNumber ? String(project.expectedDeliveryNumber) : '';

  const resetDeliveryFormForProject = (project) => {
    setDeliveryForm({ ...initialDeliveryForm, deliveryNumber: getExpectedPhaseValue(project) });
  };

  const api = window.electronAPI || {};
  const openCreateModal = () => {
    setProjectForm({ ...initialProjectForm, registeredBy: userSignature || projectForm.registeredBy });
    setShowCreate(true);
  };
  const closeCreateModal = () => {
    setShowCreate(false);
    setProjectForm({ ...initialProjectForm, registeredBy: userSignature || '' });
  };

  const loadProjects = async () => {
    if (!api.getAllProjects) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await api.getAllProjects();
      setProjects(res?.success ? res.projects ?? [] : []);
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

  const loadImportHistory = async () => {
    if (!api.getImportHistory) return;
    try {
      const res = await api.getImportHistory('projects');
      const imports = res?.success ? res.imports ?? [] : [];
      const filtered = imports.filter((item) => item && item.summary && (typeof item.summary.createdProjects === 'number' || typeof item.summary.createdDeliveries === 'number'));
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
    if (!api.importExcel) {
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
      const res = await api.importExcel(importFilePath);
      setImportResult(res);
      await loadImportHistory();
      await loadProjects();
    } catch (error) {
      setImportError(error?.message || 'Error al importar el archivo');
    } finally {
      setImportLoading(false);
    }
  };

  const handleClearImportHistory = async () => {
    if (!confirm('Eliminar todo el historial de importaciones?')) return;
    try {
      await api.clearImportHistory('projects');
      await loadImportHistory();
    } catch (error) {
      console.error('Error al limpiar historial de importaciones:', error);
    }
  };

  useEffect(() => {
    const targetId = location?.state?.openProjectId;
    if (!targetId || !projects.length) return;
    if (openedProjectRef.current === targetId) return;
    const target = projects.find((project) => project._id === targetId);
    if (target) {
      openEdit(target);
      openedProjectRef.current = targetId;
    }
  }, [location, projects]);

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!api.createProject) return;

    if (!ensureRequiredFields(projectForm)) return;

    try {
      const payload = Object.entries(projectForm).reduce((acc, [key, value]) => {
        const sanitized = typeof value === 'string' ? value.trim() : value;
        if (sanitized !== '') acc[key] = sanitized;
        return acc;
      }, {});
      const res = await api.createProject(payload);
      if (res?.success) {
        closeCreateModal();
        await loadProjects();
      } else {
        alert(res?.error || 'No se pudo crear el proyecto');
      }
    } catch (err) {
      console.error('Create project error', err);
      alert('Error creando el proyecto');
    }
  };

  const openEdit = (project) => {
    setSelectedProject(project);
    setAnteDate(project.anteprojectApprovedAt ? project.anteprojectApprovedAt.slice(0, 10) : '');
    setInfoForm(buildInfoFormFromProject(project, userSignature));
    resetDeliveryFormForProject(project);
    setActionMessage('');
  };

  const closeEdit = () => {
    setSelectedProject(null);
    setActionMessage('');
  };

  const handleDelete = async (projectId) => {
    if (!api.deleteProject) return;
    if (!confirm('¿Seguro que deseas eliminar este proyecto?')) return;

    try {
      const res = await api.deleteProject(projectId);
      if (res?.success) {
        await loadProjects();
        if (selectedProject?._id === projectId) closeEdit();
      } else {
        alert(res?.error || 'No se pudo eliminar el proyecto');
      }
    } catch (err) {
      console.error('Delete project error', err);
      alert('Error eliminando el proyecto');
    }
  };

  const refreshSelectedProject = async (projectId) => {
    if (!api.getProjectById) return;
    try {
      const refreshed = await api.getProjectById(projectId);
      if (refreshed?.success) {
        setSelectedProject(refreshed.project);
        setInfoForm(buildInfoFormFromProject(refreshed.project, userSignature));
        setAnteDate(refreshed.project.anteprojectApprovedAt ? refreshed.project.anteprojectApprovedAt.slice(0, 10) : '');
        resetDeliveryFormForProject(refreshed.project);
      }
    } catch (err) {
      console.error('Refresh project error', err);
    }
  };

  const handleApproveAnteproject = async () => {
    if (!selectedProject || !api.approveAnteproject) return;
    if (!anteDate) {
      alert('Selecciona la fecha de aprobación.');
      return;
    }
    try {
      const isoDate = new Date(anteDate).toISOString();
      const res = await api.approveAnteproject(selectedProject._id, isoDate);
      if (res?.success) {
        setActionMessage('Anteproyecto aprobado');
        await loadProjects();
        await refreshSelectedProject(selectedProject._id);
      } else {
        alert(res?.error || 'No se pudo aprobar el anteproyecto');
      }
    } catch (err) {
      console.error('Approve anteproject error', err);
      alert('Error aprobando anteproyecto');
    }
  };

  const handleSubmitDelivery = async () => {
    if (!selectedProject || !api.submitDelivery) return;
    if (!selectedProject.anteprojectApprovedAt) {
      alert('Primero aprueba el anteproyecto.');
      return;
    }

    const deliveryNumber = Number(deliveryForm.deliveryNumber);
    const title = (deliveryForm.title || '').trim();
    const description = (deliveryForm.description || '').trim();
    const observations = (deliveryForm.observations || '').trim();
    if (!deliveryNumber || !title || !description) {
      alert('Selecciona la fase esperada y completa título y descripción de la entrega.');
      return;
    }

    const expected = selectedProject.expectedDeliveryNumber || 1;
    const blockingDelivery = selectedProject.deliveries?.find(
      (d) => d.deliveryNumber === expected && (d.status === 'pending' || d.status === 'in_review')
    );
    if (blockingDelivery) {
      alert('Ya existe una entrega registrada para esta fase y aún está en revisión. Espera su resultado antes de registrar otra.');
      return;
    }
    if (deliveryNumber !== expected) {
      alert(`Debes registrar la entrega ${expected} antes de continuar.`);
      return;
    }

    try {
      const body = {
        projectId: selectedProject._id,
        deliveryNumber,
        title,
        description,
        observations,
      };
      const res = await api.submitDelivery(body);
      if (res?.success) {
        setActionMessage('Entrega registrada');
        resetDeliveryFormForProject({ ...selectedProject, expectedDeliveryNumber: expected + 1 });
        await refreshSelectedProject(selectedProject._id);
      } else {
        alert(res?.error || 'No se pudo registrar la entrega');
      }
    } catch (err) {
      console.error('Submit delivery error', err);
      alert('Error registrando entrega');
    }
  };

  const handleReviewDelivery = async (delivery, action) => {
    if (!canReviewDeliveries || !api.reviewDelivery || !delivery) return;
    if (!reviewerIdentifier) {
      alert('No se pudo identificar al revisor actual.');
      return;
    }

    const verb = action === 'approve' ? 'aprobar' : 'rechazar';
    if (!confirm(`¿Deseas ${verb} la entrega #${delivery.deliveryNumber}?`)) return;

    const notesInput = (reviewNotes[delivery._id] || '').trim();
    if (action === 'reject' && !notesInput) {
      alert('Debes agregar un motivo para rechazar la entrega.');
      return;
    }

    try {
      const res = await api.reviewDelivery(delivery._id, reviewerIdentifier, action, notesInput);
      if (res?.success) {
        setActionMessage(`Entrega ${delivery.deliveryNumber} ${action === 'approve' ? 'aprobada' : 'rechazada'}`);
        setReviewNotes((prev) => {
          const next = { ...prev };
          delete next[delivery._id];
          return next;
        });
        await loadProjects();
        await refreshSelectedProject(selectedProject._id);
      } else {
        alert(res?.error || 'No se pudo actualizar el estado de la entrega');
      }
    } catch (err) {
      console.error('Review delivery error', err);
      alert('Error revisando la entrega');
    }
  };

  const handleUpdateInfo = async (event) => {
    event.preventDefault();
    if (!selectedProject || !api.updateProject) return;

    const doc1 = (infoForm.member1Document || '').trim();
    const doc2 = (infoForm.member2Document || '').trim();
    if (doc1 && !isValidVenezuelanId(doc1)) {
      alert('La cédula del Integrante 1 debe ser numérica, con entre 6 y 9 dígitos y no puede ser solo ceros.');
      return;
    }
    if (doc2 && !isValidVenezuelanId(doc2)) {
      alert('La cédula del Integrante 2 debe ser numérica, con entre 6 y 9 dígitos y no puede ser solo ceros.');
      return;
    }

    try {
      const allowed = [
        'member1FirstNames',
        'member1LastNames',
        'member2FirstNames',
        'member2LastNames',
        'member1Document',
        'member2Document',
        'semester',
        'title',
        'description',
        'community',
        'boxNumber',
        'registeredBy',
      ];
      const payload = allowed.reduce((acc, key) => {
        if (infoForm[key] === undefined) return acc;
        const nextValue = typeof infoForm[key] === 'string' ? infoForm[key].trim() : infoForm[key];
        const currentValue = typeof selectedProject[key] === 'string' ? selectedProject[key].trim() : selectedProject[key];
        if (nextValue === currentValue) return acc;
        acc[key] = nextValue;
        return acc;
      }, {});

      if (Object.keys(payload).length === 0) {
        setActionMessage('No hay cambios para guardar');
        return;
      }
      const res = await api.updateProject(selectedProject._id, payload);
      if (res?.success) {
        setActionMessage('Información actualizada');
        await loadProjects();
        await refreshSelectedProject(selectedProject._id);
      } else {
        alert(res?.error || 'No se pudo actualizar el proyecto');
      }
    } catch (err) {
      console.error('Update project error', err);
      alert('Error actualizando el proyecto');
    }
  };

  const renderDeliveries = (project) => {
    if (!project?.deliveries?.length) {
      return <p className="text-sm text-gray-500">Sin entregas registradas aún.</p>;
    }

    return (
      <div className="space-y-2">
        {project.deliveries.map((delivery) => {
          const statusMeta = getStatusMeta(delivery.status);
          return (
            <div key={delivery._id} className="p-3 rounded bg-gray-100 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{delivery.title || `Entrega ${delivery.deliveryNumber}`}</p>
                  <p className="text-xs text-gray-500">Fase: {getPhaseLabel(delivery.deliveryNumber)}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded uppercase tracking-wide ${statusMeta.pill}`}>
                  {statusMeta.label}
                </span>
              </div>
              {delivery.submittedAt && (
                <p className="text-xs text-gray-500 mt-1">
                  Entregado: {format(new Date(delivery.submittedAt), 'dd/MM/yyyy HH:mm')}
                </p>
              )}
              {delivery.reviewerId && (
                <p className="text-xs text-gray-500">Revisado por: {delivery.reviewerId}</p>
              )}
              {(delivery.reviewComments || delivery.reviewerNotes) && (
                <p className="text-xs text-gray-600 mt-2">Notas: {delivery.reviewComments || delivery.reviewerNotes}</p>
              )}
              {['in_review', 'pending'].includes(delivery.status) && canReviewDeliveries && (
                <div className="mt-3 space-y-2 text-xs">
                  <div>
                    <label className="block mb-1 text-gray-600">Notas para la revisión</label>
                    <textarea
                      className="w-full border rounded px-2 py-1 text-sm"
                      rows={2}
                      value={reviewNotes[delivery._id] || ''}
                      onChange={(e) =>
                        setReviewNotes((prev) => ({
                          ...prev,
                          [delivery._id]: e.target.value,
                        }))
                      }
                      placeholder="Observaciones que acompañarán la decisión"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                      onClick={() => handleReviewDelivery(delivery, 'approve')}
                    >
                      Aprobar entrega
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                      onClick={() => handleReviewDelivery(delivery, 'reject')}
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderTimelineStatus = (project) => {
    const deliveries = project.deliveries || [];
    const totalDeliveries = project.totalDeliveries || 2;
    const acceptedDeliveries = deliveries.filter(
      (d) => d.status === 'approved' && d.deliveryNumber <= totalDeliveries
    ).length;
    const lastSubmission = deliveries
      .filter((d) => d.submittedAt)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0];
    const nextDueDate = project.timeline?.nextDueDate || project.nextDueDate || null;
    const currentPhase = project.timeline?.currentPhase || project.expectedDeliveryNumber || acceptedDeliveries + 1;
    const expired = project.status === 'expired';

    const rows = [
      {
        label: 'Integrantes',
        value: getMemberDisplay(project) || 'Sin registro',
      },
      {
        label: 'Cédulas',
        value: [project.member1Document || project.studentDocument, project.member2Document].filter(Boolean).join(' · ') || 'Sin indicar',
      },
      { label: 'Semestre', value: project.semester || 'Sin definir' },
      { label: 'Comunidad', value: project.community || 'Sin registro' },
      { label: 'Registrado por', value: project.registeredBy || 'No indicado' },
      { label: 'No.', value: project.rowNumber || 'Sin registro' },
      { label: 'Código', value: project.rowNumber || project.projectCode || 'N/A' },
      {
        label: 'Aprobación anteproyecto',
        value: project.anteprojectApprovedAt ? format(new Date(project.anteprojectApprovedAt), 'dd/MM/yyyy') : 'Pendiente',
      },
      { label: 'Aprobado por', value: project.approvedBy || 'Pendiente' },
      ...(nextDueDate
        ? [{ label: 'Próxima fecha límite', value: format(new Date(nextDueDate), 'dd/MM/yyyy') }]
        : []),
      { label: 'Fase actual', value: currentPhase ? getPhaseLabel(currentPhase) : 'No iniciada' },
      { label: 'Entregas completadas', value: `${acceptedDeliveries} / ${totalDeliveries}` },
      {
        label: 'Última entrega',
        value: lastSubmission ? format(new Date(lastSubmission.submittedAt), 'dd/MM/yyyy HH:mm') : 'Sin registro',
      },
      { label: 'Estado general', value: project.status || 'N/A' },
    ];

    return (
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col p-2 rounded border" style={{ borderColor: expired ? '#dc2626' : '#d1d5db' }}>
            <dt className="font-semibold text-gray-600">{row.label}</dt>
            <dd className={expired ? 'text-red-600 font-semibold' : 'text-gray-900'}>{row.value}</dd>
          </div>
        ))}
      </dl>
    );
  };

  const isAnteprojectApproved = Boolean(selectedProject?.anteprojectApprovedAt);
  const expectedPhase = selectedProject?.expectedDeliveryNumber || 1;
  const blockingDelivery = selectedProject?.deliveries?.find(
    (d) => d.deliveryNumber === expectedPhase && (d.status === 'pending' || d.status === 'in_review')
  );
  const isDeliveryWindowLocked = Boolean(blockingDelivery);

  const sortedProjects = useMemo(() => {
    const list = [...projects];
    list.sort((a, b) => {
      const aDate = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const bDate = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return bDate - aDate;
    });
    return list;
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return sortedProjects.filter((project) => {
      const normalizedSemester = normalizeSemesterLabel(project.semester) || 'Sin semestre';
      if (semesterFilter && normalizedSemester !== semesterFilter) return false;

      if (statusFilter) {
        if (statusFilter === 'pending_deliveries') {
          const hasPending = (project.deliveries || []).some((delivery) =>
            ['pending', 'in_review'].includes(delivery.status)
          );
          if (!hasPending) return false;
        } else if (project.status !== statusFilter) {
          return false;
        }
      }

      if (boxFilter) {
        const boxValue = project.boxNumber || project.certificateNumber || '';
        if (!String(boxValue).toLowerCase().includes(boxFilter.trim().toLowerCase())) return false;
      }

      if (codeFilter) {
        const codeValue = project.projectCode || project.rowNumber || '';
        if (!String(codeValue).toLowerCase().includes(codeFilter.trim().toLowerCase())) return false;
      }

      if (!term) return true;
      const members = [
        project.member1FirstNames,
        project.member1LastNames,
        project.member2FirstNames,
        project.member2LastNames,
      ]
        .filter(Boolean)
        .join(' ');
      return [project.title, project.semester, project.community, members]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [sortedProjects, searchTerm, semesterFilter, statusFilter, boxFilter, codeFilter]);

  const totalPages = useMemo(() => {
    const pages = Math.ceil(filteredProjects.length / itemsPerPage);
    return pages > 0 ? pages : 1;
  }, [filteredProjects.length, itemsPerPage]);

  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProjects.slice(start, start + itemsPerPage);
  }, [filteredProjects, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, semesterFilter, statusFilter, boxFilter, codeFilter]);

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

  const semesters = useMemo(() => {
    const set = new Set();
    projects.forEach((project) => {
      const normalized = normalizeSemesterLabel(project.semester);
      if (normalized) set.add(normalized);
    });
    return Array.from(set).sort();
  }, [projects]);

  const groupedProjects = useMemo(() => {
    return paginatedProjects.reduce((acc, project) => {
      const key = normalizeSemesterLabel(project.semester) || 'Sin semestre';
      if (!acc[key]) acc[key] = [];
      acc[key].push(project);
      return acc;
    }, {});
  }, [paginatedProjects]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold">Proyectos</h1>
            <p className="text-sm text-blue-100">Monitorea 2 entregas y controla el avance por semestre.</p>
          </div>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur border border-blue-100 rounded-2xl shadow-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <input
            type="text"
            className="w-full border border-slate-200 rounded-lg px-3 py-2"
            placeholder="Buscar por título o integrante"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <input
            type="text"
            className="w-full border border-slate-200 rounded-lg px-3 py-2"
            placeholder="Código del proyecto"
            value={codeFilter}
            onChange={(e) => setCodeFilter(e.target.value)}
          />
          <input
            type="text"
            className="w-full border border-slate-200 rounded-lg px-3 py-2"
            placeholder="Caja Nº"
            value={boxFilter}
            onChange={(e) => setBoxFilter(e.target.value)}
          />
          <select
            className="w-full border border-slate-200 rounded-lg px-3 py-2"
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
          >
            <option value="">Todos los semestres</option>
            {semesters.map((semester) => (
              <option key={semester} value={semester}>
                {semester}
              </option>
            ))}
          </select>
          <select
            className="w-full border border-slate-200 rounded-lg px-3 py-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="pending_deliveries">Con entregas pendientes</option>
            <option value="active">Activos</option>
            <option value="completed">Completados</option>
            <option value="expired">Expirados</option>
            <option value="draft">Borrador</option>
          </select>
          <div className="text-xs text-slate-500 flex items-center">
            {filteredProjects.length} proyectos encontrados
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-500">Filtros aplicados</div>
          <div className="flex flex-wrap gap-3 sm:justify-end">
            {canImportProjects && (
              <button
                type="button"
                onClick={() => {
                  setShowImport(true);
                  loadImportHistory();
                }}
                className="inline-flex items-center px-4 py-2 bg-sky-200 text-sky-900 rounded-lg hover:bg-sky-300 transition"
              >
                Importar proyectos
              </button>
            )}
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Nuevo proyecto
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando proyectos...</p>
      ) : filteredProjects.length === 0 ? (
        <div className="border-2 border-dashed rounded-2xl p-8 text-center text-gray-500">No hay proyectos registrados.</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedProjects).map(([semester, items]) => (
            <section key={semester} className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{semester}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((project) => {
                  const members = getMemberDisplay(project);

                  return (
                    <article key={project._id} className="p-4 bg-white rounded-2xl shadow-sm border border-blue-100">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h2 className="text-lg font-semibold text-slate-900">{project.title || 'Sin título'}</h2>
                          <p className="text-sm text-slate-500">Código: {project.rowNumber || project.projectCode || 'N/A'}</p>
                          <p className="text-sm text-slate-600">Integrantes: {members || 'Sin registro'}</p>
                        </div>
                        <button className="text-sm text-blue-700 hover:underline" onClick={() => openEdit(project)}>
                          Ver detalles
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
          <div className="mt-4 text-sm text-slate-600">
            Total: {filteredProjects.length} proyecto(s) 
            {' '}• Página {currentPage} de {totalPages}
          </div>
          {totalPages > 1 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
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
                    <span key={`ellipsis-${index}`} className="px-2 text-slate-500">
                      ...
                    </span>
                  ) : (
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

      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Registrar proyecto</h3>
              <button onClick={closeCreateModal} className="text-gray-500 hover:text-gray-700">
                ×
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">No.</label>
                  <input type="text" className="w-full border rounded px-3 py-2 bg-gray-100" value="Automático" readOnly />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Registrado por</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                    value={projectForm.registeredBy}
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">Capturamos tu usuario para dejar precedentes.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Integrante 1 - Nombres</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={projectForm.member1FirstNames}
                    onChange={(e) => setProjectForm({ ...projectForm, member1FirstNames: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Integrante 1 - Apellidos</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={projectForm.member1LastNames}
                    onChange={(e) => setProjectForm({ ...projectForm, member1LastNames: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Integrante 2 - Nombres</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={projectForm.member2FirstNames}
                    onChange={(e) => setProjectForm({ ...projectForm, member2FirstNames: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Integrante 2 - Apellidos</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={projectForm.member2LastNames}
                    onChange={(e) => setProjectForm({ ...projectForm, member2LastNames: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Integrante 1 - Cédula</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={projectForm.member1Document}
                    onChange={(e) => setProjectForm({ ...projectForm, member1Document: onlyDigits(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Integrante 2 - Cédula</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={projectForm.member2Document}
                    onChange={(e) => setProjectForm({ ...projectForm, member2Document: onlyDigits(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Semestre</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={projectForm.semester}
                    onChange={(e) => setProjectForm({ ...projectForm, semester: e.target.value })}
                    placeholder="8vo. SEMESTRE"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Título TC</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={projectForm.title}
                  onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Descripción (opcional)</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Comunidad</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  value={projectForm.community}
                  onChange={(e) => setProjectForm({ ...projectForm, community: e.target.value })}
                  placeholder="Consejo Comunal, sector, parroquia..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Número de caja</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={projectForm.boxNumber}
                  onChange={(e) => setProjectForm({ ...projectForm, boxNumber: e.target.value })}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button type="button" className="px-4 py-2 text-sm" onClick={closeCreateModal}>
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImport && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-3">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Importar proyectos</h3>
              <button
                type="button"
                onClick={() => setShowImport(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-sm text-slate-600 mb-2">Selecciona el archivo Excel o CSV con los proyectos.</p>
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
                Importacion completa: {importResult?.results?.createdProjects || 0} proyectos, {importResult?.results?.createdDeliveries || 0} entregas, {importResult?.results?.errors?.length || 0} errores.
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
                            ? `${item.summary.createdProjects || 0} proyectos • ${item.summary.createdDeliveries || 0} entregas • ${item.summary.errors || 0} errores`
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

      {selectedProject && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 px-2 sm:px-0">
          <div className="bg-white w-full sm:max-w-4xl h-[90vh] sm:h-auto max-h-[90vh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl shadow-xl p-4 sm:p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-semibold">{selectedProject.title || 'Sin título'}</h3>
                <p className="text-sm text-gray-500">Código: {selectedProject.rowNumber || selectedProject.projectCode || 'N/A'}</p>
              </div>
              <button onClick={closeEdit} className="text-xl text-gray-400 hover:text-gray-600">
                ×
              </button>
            </div>
            {actionMessage && <p className="mb-4 text-sm text-green-600">{actionMessage}</p>}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <section className="space-y-4">
                <article className="p-4 rounded border border-gray-200 bg-gray-50">
                  <h4 className="text-sm font-semibold text-gray-600">Info del proyecto</h4>
                  <form className="space-y-3" onSubmit={handleUpdateInfo}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500">No.</label>
                        <input
                          type="text"
                          className="w-full border rounded px-3 py-2 bg-gray-100"
                          value={infoForm.rowNumber || 'Automático'}
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500">Registrado por</label>
                        <input
                          type="text"
                          className="w-full border rounded px-3 py-2 bg-gray-100"
                          value={infoForm.registeredBy}
                          readOnly
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500">Integrante 1 - Nombres</label>
                        <input
                          type="text"
                          className="w-full border rounded px-3 py-2"
                          value={infoForm.member1FirstNames}
                          onChange={(e) => setInfoForm({ ...infoForm, member1FirstNames: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500">Integrante 1 - Apellidos</label>
                        <input
                          type="text"
                          className="w-full border rounded px-3 py-2"
                          value={infoForm.member1LastNames}
                          onChange={(e) => setInfoForm({ ...infoForm, member1LastNames: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500">Integrante 2 - Nombres</label>
                        <input
                          type="text"
                          className="w-full border rounded px-3 py-2"
                          value={infoForm.member2FirstNames}
                          onChange={(e) => setInfoForm({ ...infoForm, member2FirstNames: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500">Integrante 2 - Apellidos</label>
                        <input
                          type="text"
                          className="w-full border rounded px-3 py-2"
                          value={infoForm.member2LastNames}
                          onChange={(e) => setInfoForm({ ...infoForm, member2LastNames: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500">Integrante 1 - Cédula</label>
                        <input
                          type="text"
                          className="w-full border rounded px-3 py-2"
                          value={infoForm.member1Document}
                          onChange={(e) => setInfoForm({ ...infoForm, member1Document: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500">Integrante 2 - Cédula</label>
                        <input
                          type="text"
                          className="w-full border rounded px-3 py-2"
                          value={infoForm.member2Document}
                          onChange={(e) => setInfoForm({ ...infoForm, member2Document: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500">Semestre</label>
                        <input
                          type="text"
                          className="w-full border rounded px-3 py-2"
                          value={infoForm.semester}
                          onChange={(e) => setInfoForm({ ...infoForm, semester: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Título TC</label>
                      <input
                        type="text"
                        className="w-full border rounded px-3 py-2"
                        value={infoForm.title}
                        onChange={(e) => setInfoForm({ ...infoForm, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Descripción</label>
                      <textarea
                        className="w-full border rounded px-3 py-2"
                        value={infoForm.description}
                        onChange={(e) => setInfoForm({ ...infoForm, description: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">Comunidad</label>
                      <textarea
                        className="w-full border rounded px-3 py-2"
                        value={infoForm.community}
                        onChange={(e) => setInfoForm({ ...infoForm, community: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500">Número de caja</label>
                        <input
                          type="text"
                          className="w-full border rounded px-3 py-2"
                          value={infoForm.boxNumber}
                          onChange={(e) => setInfoForm({ ...infoForm, boxNumber: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <button type="button" className="text-sm text-red-500" onClick={() => handleDelete(selectedProject._id)}>
                        Eliminar proyecto
                      </button>
                      <button type="submit" className="px-3 py-2 bg-primary-600 text-white text-sm rounded">
                        Guardar cambios
                      </button>
                    </div>
                  </form>
                </article>
                {!isAnteprojectApproved ? (
                  <article className="p-4 rounded border border-gray-200 bg-white">
                    <h4 className="text-sm font-semibold text-gray-600">Aprobación anteproyecto</h4>
                    <p className="text-xs text-gray-500 mb-2">Configura el punto de partida del temporizador.</p>
                    <label className="block text-xs text-gray-500">Fecha de aprobación</label>
                    <input
                      type="date"
                      className="w-full border rounded px-3 py-2"
                      value={anteDate}
                      onChange={(e) => setAnteDate(e.target.value)}
                    />
                    <button onClick={handleApproveAnteproject} className="mt-3 w-full px-3 py-2 bg-green-600 text-white rounded">
                      Aprobar anteproyecto
                    </button>
                  </article>
                ) : (
                  <article className="p-4 rounded border border-gray-200 bg-white">
                    <h4 className="text-sm font-semibold text-gray-600">Anteproyecto aprobado</h4>
                    <p className="text-xs text-gray-500">Fecha: {format(new Date(selectedProject.anteprojectApprovedAt), 'dd/MM/yyyy')}</p>
                    <p className="text-xs text-gray-500">Aprobado por: {selectedProject.approvedBy || 'Sin registro'}</p>
                    {selectedProject.timeline?.nextDueDate && (
                      <p className="text-xs text-gray-500 mt-1">
                        Próxima fecha límite: {format(new Date(selectedProject.timeline.nextDueDate), 'dd/MM/yyyy')}
                      </p>
                    )}
                  </article>
                )}
                {isAnteprojectApproved && (
                  <article className="p-4 rounded border border-gray-200 bg-white">
                    <h4 className="text-sm font-semibold text-gray-600">Registrar entrega</h4>
                    <p className="text-xs text-gray-500 mb-2">Solo se permite siguiendo la secuencia del temporizador.</p>
                    <p className="text-xs text-blue-600 mb-2">Entrega permitida ahora: {getPhaseLabel(expectedPhase)}</p>
                    {isDeliveryWindowLocked && (
                      <p className="text-xs text-red-600 mb-2">
                        Ya existe una entrega en revisión para esta fase. Espera el resultado para registrar la siguiente.
                      </p>
                    )}
                    <select
                      className="w-full border rounded px-3 py-2"
                      value={deliveryForm.deliveryNumber}
                      onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryNumber: e.target.value })}
                      disabled={isDeliveryWindowLocked}
                    >
                      <option value="">Selecciona la fase</option>
                      <option value="1" disabled={expectedPhase !== 1}>Anteproyecto</option>
                      <option value="2" disabled={expectedPhase !== 2}>Proyecto final</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Título de la entrega"
                      className="mt-2 w-full border rounded px-3 py-2"
                      value={deliveryForm.title}
                      onChange={(e) => setDeliveryForm({ ...deliveryForm, title: e.target.value })}
                      disabled={isDeliveryWindowLocked}
                    />
                    <textarea
                      placeholder="Descripción"
                      className="mt-2 w-full border rounded px-3 py-2"
                      value={deliveryForm.description}
                      onChange={(e) => setDeliveryForm({ ...deliveryForm, description: e.target.value })}
                      disabled={isDeliveryWindowLocked}
                    />
                    <button
                      onClick={handleSubmitDelivery}
                      disabled={isDeliveryWindowLocked}
                      className={`mt-3 w-full px-3 py-2 rounded text-white ${
                        isDeliveryWindowLocked ? 'bg-primary-300 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'
                      }`}
                    >
                      Registrar entrega
                    </button>
                  </article>
                )}
              </section>
              <section className="lg:col-span-2 space-y-6">
                <article className="p-4 border rounded bg-white">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-gray-600">Estado del temporizador</h4>
                    {selectedProject.timeline?.nextDueDate && (
                      <span className="text-sm text-gray-500">
                        Próxima fecha límite: {format(new Date(selectedProject.timeline.nextDueDate), 'dd/MM/yyyy')}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[1, 2].map((phase) => {
                      const delivery = selectedProject.deliveries?.find((d) => d.deliveryNumber === phase);
                      const isCurrent = (selectedProject.expectedDeliveryNumber || 1) === phase && !delivery;
                      const isCompleted = delivery?.status === 'approved';
                      const expired = selectedProject.status === 'expired';
                      const statusMeta = getStatusMeta(delivery?.status);

                      return (
                        <div
                          key={phase}
                          className={`p-4 border rounded ${
                            isCompleted
                              ? 'bg-green-50 border-green-200'
                              : isCurrent
                                ? 'bg-yellow-50 border-yellow-200'
                                : 'bg-gray-50 border-gray-200'
                          } ${expired ? 'opacity-60' : ''}`}
                        >
                          <p className="text-xs text-gray-500">{getPhaseLabel(phase)}</p>
                          <p className="text-sm font-semibold">{delivery ? delivery.title : 'Sin registro'}</p>
                          <p className="text-xs text-gray-500">
                            {delivery?.submittedAt ? format(new Date(delivery.submittedAt), 'dd/MM/yyyy') : 'Pendiente'}
                          </p>
                          {delivery?.status && (
                            <span className={`mt-2 inline-flex px-2 py-1 rounded text-xs uppercase tracking-wide ${statusMeta.pill}`}>
                              {statusMeta.label}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </article>
                <article className="p-4 border rounded bg-white">
                  <h4 className="text-sm font-semibold text-gray-600 mb-3">Historial de entregas</h4>
                  {renderDeliveries(selectedProject)}
                </article>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
