# USM-CST Architecture Documentation

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USM-CST Application                         │
│                                                                     │
│  ┌────────────────────────┐        ┌─────────────────────────────┐ │
│  │   Presentation Layer   │        │     Main Process (Node.js)  │ │
│  │      (React UI)        │◄──────►│        (Electron)           │ │
│  │                        │  IPC   │                             │ │
│  │  - Pages               │        │  - Controllers              │ │
│  │  - Components          │        │  - Use Cases                │ │
│  │  - Routing             │        │  - Services                 │ │
│  └────────────────────────┘        │  - Repositories             │ │
│                                    └──────────┬──────────────────┘ │
│                                               │                     │
│                                    ┌──────────▼──────────────────┐ │
│                                    │    Database Layer (NeDB)    │ │
│                                    │                             │ │
│                                    │  - users.db                 │ │
│                                    │  - projects.db              │ │
│                                    │  - deliveries.db            │ │
│                                    │  - notifications.db         │ │
│                                    └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Layered Architecture

### 1. Presentation Layer (React Frontend - Renderer Process)

**Location**: `src/`

**Responsibilities**:
- User interface rendering
- User input handling
- State management
- Routing between pages
- Communication with Electron backend via IPC

**Components**:
```
src/
├── App.jsx                    # Main application component with routing
├── main.jsx                   # React entry point
├── pages/                     # Page components for each role
│   ├── Login.jsx             # Authentication page
│   ├── SuperAdmin/           # Super Admin features
│   │   ├── Dashboard.jsx     # Overview & statistics
│   │   └── UserManagement.jsx # Create/manage users
│   ├── Admin/                # Administrator features
│   │   └── Dashboard.jsx     # Admin dashboard
│   ├── Reviewer/             # Reviewer features (to be implemented)
│   └── Student/              # Student features (to be implemented)
└── styles/                   # CSS and Tailwind styles
    └── index.css
```

**Key Technologies**:
- React 18 (UI framework)
- React Router (navigation)
- Tailwind CSS (styling)

---

### 2. IPC Communication Layer

**Location**: `electron/preload.js` and `electron/ipc/handlers.js`

**Responsibilities**:
- Bridge between frontend and backend
- Expose secure APIs to renderer process
- Handle all IPC communication

**Architecture**:
```
Frontend (React)
      ↓
window.electronAPI.login()
      ↓
ipcRenderer.invoke('user:login')
      ↓
IPC Handler in Main Process
      ↓
UserController.login()
```

**Security**: Uses Context Isolation and Preload script to prevent direct Node.js access from renderer.

---

### 3. Controller Layer

**Location**: `electron/controllers/`

**Responsibilities**:
- Handle incoming requests from IPC
- Validate user authentication
- Call appropriate use cases
- Return formatted responses

**Classes**:
```
electron/controllers/
├── UserController.js          # User management operations
├── ProjectController.js       # Project CRUD operations (to be implemented)
└── DeliveryController.js      # Delivery workflow (to be implemented)
```

**Pattern**: Each controller manages a specific domain entity.

---

### 4. Business Logic Layer

**Location**: `electron/core/`

**Responsibilities**:
- Implement business rules
- Enforce workflow logic
- Coordinate between services and repositories

#### Use Cases

**Location**: `electron/core/useCases/`

Each use case represents a specific business operation:

```
electron/core/useCases/
└── user/
    ├── LoginUserUseCase.js         # Authenticate user
    ├── CreateUserUseCase.js        # Create new user with validations
    └── GetAllUsersUseCase.js       # Retrieve users with filters
```

**Use Case Pattern**:
```javascript
class CreateUserUseCase {
  async execute(userData, creatorRole) {
    // 1. Validate permissions
    // 2. Check business rules
    // 3. Call repository
    // 4. Return result
  }
}
```

#### Services

**Location**: `electron/core/services/`

Reusable business services:

```
electron/core/services/
├── EmailService.js            # Email notifications
├── AuthService.js             # Authentication (to be implemented)
└── ProjectService.js          # Project business logic (to be implemented)
```

---

### 5. Data Access Layer

**Location**: `electron/database/repositories/`

**Responsibilities**:
- Abstract database operations
- Provide clean API for data access
- Handle database queries

**Repository Pattern**:

```
electron/database/repositories/
├── BaseRepository.js          # Common CRUD operations
├── UserRepository.js          # User-specific queries
├── ProjectRepository.js       # Project-specific queries
└── DeliveryRepository.js      # Delivery-specific queries
```

**Base Repository Methods**:
- `findAll(query)` - Get multiple records
- `findOne(query)` - Get single record
- `findById(id)` - Get by ID
- `create(data)` - Insert new record
- `update(id, data)` - Update record
- `delete(id)` - Delete record
- `count(query)` - Count records

---

### 6. Database Layer

**Location**: `data/` (auto-created)

**Technology**: NeDB (Embedded NoSQL database)

**Databases**:
- `users.db` - User accounts
- `projects.db` - Community service projects
- `deliveries.db` - Project deliveries
- `notifications.db` - Notification history

**Advantages**:
- No external database server needed
- File-based storage
- MongoDB-like API
- Perfect for desktop applications

---

## Data Models

### User Model
```javascript
{
  _id: String,              // Auto-generated
  username: String,         // Unique
  password: String,         // Hashed with bcrypt
  email: String,            // Unique
  role: String,             // 'super_admin' | 'admin' | 'reviewer' | 'student'
  firstName: String,
  lastName: String,
  active: Boolean,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Project Model (To be fully implemented)
```javascript
{
  _id: String,
  projectCode: String,      // Unique identifier
  name: String,
  description: String,
  studentId: String,        // Reference to User
  reviewerId: String,       // Reference to User
  status: String,           // 'active' | 'completed' | 'cancelled'
  startDate: Date,
  endDate: Date,            // Auto-calculated (startDate + 3 months)
  createdAt: Date,
  updatedAt: Date
}
```

### Delivery Model (To be fully implemented)
```javascript
{
  _id: String,
  projectId: String,        // Reference to Project
  deliveryNumber: Number,   // 1, 2, 3, etc.
  title: String,
  description: String,
  attachments: Array,
  status: String,           // 'pending' | 'in_review' | 'approved' | 'rejected'
  reviewerId: String,
  reviewComments: String,
  reviewedAt: Date,
  submittedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Workflow Logic

### Sequential Delivery Approval

```
Project Created
    ↓
Delivery 1 Submitted
    ↓
Delivery 1 Reviewed
    ├── Approved → Delivery 2 can be submitted
    └── Rejected → Delivery 1 must be resubmitted
                   Delivery 2 CANNOT be submitted
```

**Implementation**: 
```javascript
// In DeliveryRepository.js
async canSubmitNextDelivery(projectId, deliveryNumber) {
  if (deliveryNumber === 1) return true;
  
  const previousDelivery = await this.findOne({
    projectId,
    deliveryNumber: deliveryNumber - 1
  });
  
  return previousDelivery && previousDelivery.status === 'approved';
}
```

---

## Role-Based Access Control (RBAC)

### Role Hierarchy

```
Super Admin (Unique, Cannot be deleted)
    ↓ Can create and manage
Administrator (Multiple)
    ↓ Can create and manage
Reviewer (Multiple)
    ↓ Reviews projects from
Student (Multiple, Passive)
```

### Permissions

| Action | Super Admin | Admin | Reviewer | Student |
|--------|-------------|-------|----------|---------|
| Create Users | All roles | Reviewer, Student | No | No |
| Delete Users | Yes | Reviewer, Student only | No | No |
| Create Projects | Yes | Yes | No | No |
| Review Deliveries | Yes | Yes | Yes | No |
| Submit Deliveries | No | No | No | Yes (via system) |
| View Reports | Yes | Yes | Yes | No |

---

## Email Notification Flow

```
Action Occurs (e.g., Delivery Submitted)
    ↓
Controller calls EmailService
    ↓
EmailService prepares email from template
    ↓
NodeMailer sends via SMTP
    ↓
Email delivered to recipient
```

**Email Templates**: Defined in `electron/config/email.js`

---

## Security Features

1. **Password Hashing**: bcryptjs with salt rounds (10)
2. **Context Isolation**: Renderer process isolated from Node.js
3. **Preload Script**: Secure IPC bridge
4. **Authentication Check**: All operations verify user session
5. **Role-Based Validation**: Use cases check user permissions

---

## Development vs Production

### Development Mode
- Hot reload enabled
- DevTools open automatically
- Vite dev server on port 5173
- Console logging enabled

### Production Mode (To be configured)
- Built React app bundled
- No DevTools
- Optimized performance
- Packaged as desktop application

---

## Extension Points

Areas designed for future expansion:

1. **New Roles**: Add new user roles in `config/database.js`
2. **Custom Reports**: Add report generators in `core/services/`
3. **Notifications**: Extend `EmailService` for SMS/Push notifications
4. **File Uploads**: Add file handling in delivery submissions
5. **Dashboard Widgets**: Add new components in `pages/`

---

## Technology Decisions

### Why Electron?
- Cross-platform desktop application
- Full Node.js access for database and file system
- Familiar web technologies (HTML, CSS, JavaScript)

### Why React?
- Component-based architecture
- Large ecosystem
- Excellent developer experience

### Why NeDB?
- No external database server needed
- Perfect for desktop applications
- MongoDB-like API (familiar to developers)

### Why Tailwind CSS?
- Rapid UI development
- Consistent design system
- Minimal custom CSS needed

---

## Performance Considerations

1. **Database Indexes**: Created on username, email, projectCode
2. **Lazy Loading**: Pages loaded on demand via React Router
3. **IPC Optimization**: Batch operations when possible
4. **Memory Management**: Singleton pattern for database connection

---

## Testing Strategy (To be implemented)

Recommended testing approach:

1. **Unit Tests**: Use Cases and Services (Jest)
2. **Integration Tests**: Repositories and Database (Jest)
3. **E2E Tests**: Full user workflows (Playwright)
4. **Manual Testing**: UI/UX validation

---

**This architecture ensures maintainability, scalability, and clean separation of concerns.**
