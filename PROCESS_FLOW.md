# Diagrama de Procesos — SC-SYSTEM

Este documento describe, en español, los principales procesos implementados en este proyecto hasta la fecha y muestra un diagrama de flujo (Mermaid) que representa las interacciones entre el usuario, la interfaz (renderer), el proceso principal (Electron main) y la base de datos.

> Nota: GitHub y muchas extensiones de VS Code soportan renderizar diagramas Mermaid dentro de Markdown. Si tu visor no los muestra, verás el código fuente del diagrama debajo y también hay una versión textual para lectura rápida.

## Resumen de procesos principales

- **Inicio de sesión (Login)**: el usuario envía credenciales desde el renderer -> `preload` -> IPC a `main` -> `UserController` valida con `UserRepository` -> respuesta al renderer.
- **Gestión de Proyectos**: Admin/SuperAdmin pueden crear/editar/eliminar proyectos. Renderer envía acciones por IPC a `ipc/handlers.js` -> `ProjectRepository` / use-cases -> BD.
- **Envío de Entregas (Deliveries)**: Estudiantes (pasivos) o procesos de entrega crean entregas secuenciales; `DeliveryRepository` asegura que sólo se puede enviar la siguiente entrega cuando la anterior está en estado correcto.
- **Revisión por Reviewer**: Reviewer obtiene entregas pendientes -> revisa (aprobar/rechazar) -> `DeliveryController` actualiza estado y opcionalmente notifica por email.
- **Notificaciones / Email**: `EmailService` crea y envía correos cuando se requiere (p.ej. notificar aprobación). Esto se realiza desde `main` usando `nodemailer` configurado en `electron/core/services/EmailService.js`.
- **IPC / Preload**: `preload.js` expone una API segura (`window.electronAPI.*`) usada por el renderer para todas las llamadas al main.
- **Seed / Inicialización**: Al iniciar la aplicación, la BD se inicializa y se ejecuta el seed para crear el Super Admin y datos de prueba si es necesario.

## Diagrama de flujo (Mermaid)

```mermaid
graph TD
  U[Usuario (UI)] -->|login| R[Renderer]
  R -->|electronAPI.login| P[Preload IPC]
  P -->|ipc:user:login| M[Main IPC Handlers]
  M --> UC[UserController]
  UC --> UR[UserRepository]
  UR --> DB[(NeDB files)]
  DB --> UR
  UR --> UC
  UC --> M
  M --> P
  P --> R

  R -->|navegación: Projects| PRJ[Projects Page]
  PRJ -->|create/update/delete| P
  P -->|ipc:project| PR[ProjectRepository]
  PR --> DB
  PR --> P
  P --> PRJ

  %% Deliveries flow
  R -->|submit delivery| P
  P -->|ipc:delivery:submit| DC[DeliveryController]
  DC --> DR[DeliveryRepository]
  DR --> DB
  DR --> DC
  DC --> M
  M --> P
  P --> R

  %% Reviewer review flow
  R -->|review action| P
  P -->|ipc:delivery:review| DC
  DC --> DR
  DC --> ES[EmailService]
  ES --> SMTP[(SMTP)]

  style U fill:#f9f,stroke:#333,stroke-width:1px
  style R fill:#ccf,stroke:#333
  style M fill:#cfc,stroke:#333
  style DB fill:#ffd,stroke:#333
  style ES fill:#fcc,stroke:#333
```

## Explicación paso a paso (nodos del diagrama)

- **Usuario (UI)**: persona que interactúa con la interfaz React (renderer). Puede ser Super Admin, Admin o Reviewer.
- **Renderer**: aplicación React (Vite) que muestra las páginas (`Projects`, `Reviewer Dashboard`, `UserManagement`, etc.). Llama a `window.electronAPI` para acciones que requieren filesystem o DB.
- **Preload / IPC**: `electron/preload.js` expone métodos seguros que envían/reciben mensajes IPC entre renderer y main.
- **Main / IPC Handlers**: `electron/ipc/handlers.js` registra handlers como `user:login`, `project:create`, `delivery:submit`, `delivery:review`, etc. Estos handlers invocan controllers y repositorios.
- **Controllers / Use-cases**: Lógica de aplicación en `core/useCases` y `controllers` — validaciones, reglas de negocio (p.ej. `canSubmitNextDelivery`).
- **Repositories**: Abstracción de acceso a datos en `database/repositories` (UserRepository, ProjectRepository, DeliveryRepository). Usan NeDB (almacenamiento en archivos) configurado en `database/connection.js`.
- **EmailService**: Servicio que encapsula `nodemailer` para enviar correos desde el proceso principal.

## Ejemplos de flujos concretos

- Flujo de Login
  1. El usuario introduce credenciales y hace click en Login.
  2. Renderer llama `electronAPI.login(credentials)`.
  3. Preload emite `ipcRenderer.invoke('user:login', credentials)`.
  4. Main recibe, `UserController` valida con `UserRepository`.
  5. Si OK, main responde con user data; renderer guarda `currentUser`.

- Flujo de Crear Proyecto
  1. Admin en `Projects.jsx` rellena el formulario y pulsa Crear.
  2. Renderer llama `electronAPI.createProject(projectData)`.
  3. Handler `project:create` en main usa `ProjectRepository.insert`.
  4. BD persiste el documento y retorna el id.
  5. Renderer pide `getAllProjects` para refrescar la lista.

- Flujo de Envío y Revisión de Entregas
  1. Un estudiante sube entrega n (submit delivery) — `delivery:submit`.
  2. `DeliveryRepository` valida secuencia (no permitir n+1 si n no existe/está pendiente).
  3. Delivery creado con estado `pending`.
  4. Reviewer consulta entregas pendientes; abre entrega y decide Aprobar/Rechazar.
  5. `delivery:review` actualiza el estado a `approved` o `rejected`.
  6. Opcional: `EmailService` notifica al creador de la entrega.

## Cómo visualizar el diagrama

- En GitHub: abre `PROCESS_FLOW.md` en tu repo; GitHub renderiza Mermaid automáticamente.
- En VS Code: instala la extensión `vstirbu.vscode-mermaid-preview` o usa la vista previa integrada si tu VS Code la soporta.
- Alternativa: copia el bloque Mermaid en https://mermaid.live/ para ver y exportar PNG/SVG.

## Siguientes pasos (opcional)

- Convertir el diagrama en imágenes exportadas (`PNG`/`SVG`) y añadirlas al repo en `docs/`.
- Añadir un diagrama de componentes (arquitectura) separado mostrando carpetas y dependencias.
- Documentar workflows de despliegue o `npm run dev` para desarrolladores nuevos.
---

Archivo generado automáticamente: `PROCESS_FLOW.md` — si quieres que ajuste el nivel de detalle, traducir más términos, o generar un PNG del diagrama, dime y lo hago.
