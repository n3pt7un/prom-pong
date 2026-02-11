# Cyber-Pong Arcade League - Documentation Index

Welcome to the comprehensive documentation for Cyber-Pong Arcade League. This documentation is designed for both human developers and AI coding agents.

## Documentation Structure

### For Developers

**Start Here:**
1. [Main README](../README.md) - Project overview, quick start, deployment
2. [DEVELOPMENT.md](./DEVELOPMENT.md) - Development guide, setup, workflows
3. [USER_GUIDE.md](../source/USER_GUIDE.md) - End-user documentation

**Deep Dive:**
4. [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture, data flow, design decisions
5. [API_REFERENCE.md](./API_REFERENCE.md) - Complete API endpoint documentation
6. [DATABASE.md](./DATABASE.md) - Database schema, migrations, operations

### For AI Coding Agents

**Essential Reading:**
1. [AGENT_GUIDE.md](./AGENT_GUIDE.md) - AI-specific guide with patterns and examples
2. [API_REFERENCE.md](./API_REFERENCE.md) - API endpoints and data types
3. [DEVELOPMENT.md](./DEVELOPMENT.md) - Code structure and conventions

**Reference:**
4. [types.ts](../source/types.ts) - TypeScript type definitions (READ THIS FIRST)
5. [constants.ts](../source/constants.ts) - Application constants
6. [ARCHITECTURE.md](./ARCHITECTURE.md) - System design and data flow

## Quick Navigation

### By Topic

#### Getting Started
- [Installation & Setup](./DEVELOPMENT.md#local-development-setup)
- [Environment Configuration](./DEVELOPMENT.md#environment-variables)
- [Running Locally](./DEVELOPMENT.md#development-workflow)
- [First Deployment](../README.md#deployment-google-cloud-run)

#### Development
- [Project Structure](./DEVELOPMENT.md#project-structure)
- [Adding Features](./AGENT_GUIDE.md#common-patterns)
- [Component Guide](./DEVELOPMENT.md#component-guide)
- [Testing](./DEVELOPMENT.md#testing)

#### API & Backend
- [API Endpoints](./API_REFERENCE.md#endpoints)
- [Authentication](./API_REFERENCE.md#authentication)
- [Data Types](./API_REFERENCE.md#data-types)
- [Error Handling](./AGENT_GUIDE.md#pattern-5-error-handling)

#### Database
- [Schema Overview](./DATABASE.md#supabase-schema)
- [Database Modes](./DATABASE.md#database-modes)
- [Migrations](./DATABASE.md#migration-from-json-to-supabase)
- [Backup & Recovery](./DATABASE.md#backup-and-recovery)

#### Architecture
- [System Overview](./ARCHITECTURE.md#system-overview)
- [Data Flow](./ARCHITECTURE.md#data-flow)
- [Security](./ARCHITECTURE.md#security-architecture)
- [Deployment](./ARCHITECTURE.md#deployment-architecture)

#### Troubleshooting
- [Common Issues](./DEVELOPMENT.md#troubleshooting)
- [Debugging Tips](./AGENT_GUIDE.md#debugging-tips)
- [Performance](./ARCHITECTURE.md#performance-architecture)

### By Role

#### Frontend Developer
1. [Component Structure](./DEVELOPMENT.md#component-guide)
2. [State Management](./ARCHITECTURE.md#frontend-architecture)
3. [Styling Guidelines](./AGENT_GUIDE.md#styling-guidelines)
4. [API Client Usage](./AGENT_GUIDE.md#api-client-pattern)

#### Backend Developer
1. [Server Architecture](./ARCHITECTURE.md#backend-architecture)
2. [API Endpoints](./API_REFERENCE.md)
3. [Database Operations](./DATABASE.md#database-operations)
4. [Authentication](./DEVELOPMENT.md#authentication-flow)

#### DevOps Engineer
1. [Deployment Guide](../README.md#deployment-google-cloud-run)
2. [Container Architecture](./ARCHITECTURE.md#container-architecture)
3. [Environment Variables](./DEVELOPMENT.md#environment-variables)
4. [Monitoring](./ARCHITECTURE.md#monitoring-architecture)

#### AI Coding Agent
1. [Agent Guide](./AGENT_GUIDE.md) - Start here!
2. [Code Patterns](./AGENT_GUIDE.md#common-patterns)
3. [Type Definitions](../source/types.ts)
4. [Quick Reference](./AGENT_GUIDE.md#quick-reference)

## Document Summaries

### DEVELOPMENT.md
**Purpose:** Comprehensive development guide for human developers

**Contents:**
- Technology stack overview
- Project structure explanation
- Local development setup
- Core concepts (auth, data flow, ELO system)
- Component creation guide
- API development guide
- Testing strategies
- Deployment procedures
- Troubleshooting

**When to use:** Setting up development environment, understanding codebase structure, adding new features

### AGENT_GUIDE.md
**Purpose:** AI-specific guide with patterns and examples

**Contents:**
- Quick context for AI agents
- File organization and navigation
- Common code patterns with examples
- Code generation guidelines
- TypeScript usage
- Component templates
- Database operations
- Testing approach
- Common pitfalls and solutions
- Quick reference

**When to use:** AI agents working on the codebase, need quick patterns and examples

### API_REFERENCE.md
**Purpose:** Complete REST API documentation

**Contents:**
- Authentication details
- All API endpoints with examples
- Request/response formats
- Data type definitions
- Error codes
- Rate limiting info

**When to use:** Implementing API clients, understanding backend contracts, debugging API issues

### DATABASE.md
**Purpose:** Database schema and operations

**Contents:**
- Database modes (Supabase, GCS, Local)
- Complete schema documentation
- Table relationships
- Migration procedures
- Backup and recovery
- Performance optimization
- Security considerations

**When to use:** Database design, migrations, data modeling, performance tuning

### ARCHITECTURE.md
**Purpose:** System design and architecture decisions

**Contents:**
- High-level architecture
- Component architecture
- Data flow diagrams
- Security architecture
- Deployment architecture
- Performance considerations
- Monitoring and logging
- Future enhancements

**When to use:** Understanding system design, making architectural decisions, scaling planning

## Key Files Reference

### Configuration Files

```
source/
├── .env                    # Environment variables (not in git)
├── .env.example           # Environment template
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite build configuration
├── Dockerfile             # Container build instructions
└── .gcloudignore         # Files to exclude from deployment
```

### Core Application Files

```
source/
├── index.html             # HTML entry point
├── index.tsx              # React entry point
├── App.tsx                # Root component
├── types.ts               # Type definitions (CRITICAL)
├── constants.ts           # Application constants
├── achievements.ts        # Achievement definitions
└── firebaseConfig.ts      # Firebase client config
```

### Backend Files

```
source/server/
├── index.js               # Server entry point
├── config.js              # Server configuration
├── routes/                # API route handlers
│   ├── state.js
│   ├── players.js
│   ├── matches.js
│   └── ... (12 route files)
├── middleware/
│   └── auth.js           # Authentication middleware
├── services/
│   └── elo.js            # ELO calculation
└── db/
    ├── persistence.js    # Database I/O
    ├── operations.js     # CRUD operations
    └── mappers.js        # Data transformation
```

### Frontend Files

```
source/
├── components/            # UI components (20+ files)
│   ├── Layout.tsx
│   ├── Leaderboard.tsx
│   ├── MatchLogger.tsx
│   └── ...
├── context/              # React Context providers
│   ├── AuthContext.tsx
│   ├── LeagueContext.tsx
│   └── ToastContext.tsx
├── services/             # Business logic
│   ├── storageService.ts
│   ├── authService.ts
│   └── eloService.ts
├── utils/                # Helper functions
│   ├── imageUtils.ts
│   ├── statsUtils.ts
│   └── ...
└── hooks/                # Custom React hooks
    └── useLeagueHandlers.ts
```

## Common Tasks

### Adding a New Feature

1. Read [AGENT_GUIDE.md - Pattern 1](./AGENT_GUIDE.md#pattern-1-adding-a-new-api-endpoint)
2. Update [types.ts](../source/types.ts) if needed
3. Add API endpoint in `server/routes/`
4. Add client method in `services/storageService.ts`
5. Create/update component in `components/`
6. Test locally with `npm run dev`

### Fixing a Bug

1. Identify affected component/endpoint
2. Check [Debugging Tips](./AGENT_GUIDE.md#debugging-tips)
3. Add logging to isolate issue
4. Fix and test locally
5. Verify no regressions

### Deploying Changes

1. Test locally: `npm run build && npm start`
2. Commit changes to git
3. Deploy: `gcloud run deploy SERVICE_NAME --source=.`
4. Verify deployment in production
5. Monitor logs for errors

### Database Migration

1. Read [DATABASE.md - Migration](./DATABASE.md#migration-from-json-to-supabase)
2. Update schema in `supabase/migrations/`
3. Run migration script
4. Test with sample data
5. Update application code
6. Deploy changes

## External Resources

### Official Documentation
- [React](https://react.dev) - Frontend framework
- [TypeScript](https://www.typescriptlang.org/docs) - Type system
- [Express](https://expressjs.com) - Backend framework
- [Vite](https://vitejs.dev) - Build tool
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [Firebase](https://firebase.google.com/docs) - Authentication
- [Supabase](https://supabase.com/docs) - Database
- [Google Cloud Run](https://cloud.google.com/run/docs) - Hosting

### Tools
- [Lucide Icons](https://lucide.dev) - Icon library
- [Recharts](https://recharts.org) - Charts
- [date-fns](https://date-fns.org) - Date utilities

## Contributing

### For Developers

1. Fork the repository
2. Create a feature branch
3. Make changes following [DEVELOPMENT.md](./DEVELOPMENT.md) guidelines
4. Test thoroughly
5. Submit pull request with clear description

### For AI Agents

1. Read [AGENT_GUIDE.md](./AGENT_GUIDE.md) first
2. Follow established patterns
3. Use existing types from `types.ts`
4. Add proper error handling
5. Test changes locally
6. Document new features

## Getting Help

### Documentation Issues
- Check relevant documentation file
- Search for keywords in all docs
- Review code examples in [AGENT_GUIDE.md](./AGENT_GUIDE.md)

### Code Issues
- Check [Troubleshooting](./DEVELOPMENT.md#troubleshooting)
- Review [Common Pitfalls](./AGENT_GUIDE.md#common-pitfalls)
- Look at similar existing code
- Check server/browser console logs

### Deployment Issues
- Review [Deployment Guide](../README.md#deployment-google-cloud-run)
- Check Cloud Run logs
- Verify environment variables
- Check service account permissions

## Version History

- **v2.1** (2024-02-11) - Current version
  - Supabase PostgreSQL support
  - League management
  - Friendly matches
  - Split singles/doubles stats
  - Comprehensive documentation

- **v2.0** (2024-02-09)
  - Firebase authentication
  - Pending match confirmation
  - Seasons and tournaments
  - Challenges system
  - Admin controls

- **v1.0** (2024-01-15)
  - Initial release
  - Basic ELO system
  - Match logging
  - Player profiles
  - Racket system

## License

This project is for personal/educational use. Not affiliated with any commercial entity.

## Maintenance

### Documentation Updates

When making significant changes:
1. Update relevant documentation files
2. Update this index if structure changes
3. Update version history
4. Keep examples current with code

### Code Maintenance

Regular tasks:
- Update dependencies (`npm update`)
- Review and fix security vulnerabilities
- Optimize performance bottlenecks
- Refactor technical debt
- Update documentation

---

**Last Updated:** February 11, 2024  
**Documentation Version:** 1.0  
**Application Version:** 2.1
