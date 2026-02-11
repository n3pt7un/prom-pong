# AI Agent Development Guide

This guide is specifically designed for AI coding agents working on the Cyber-Pong Arcade League codebase. It provides context, patterns, and best practices for autonomous code generation and modification.

## Quick Context

**What is this project?**
A full-stack ping pong league management application with ELO rankings, tournaments, seasons, and player profiles. Built with React + Express, deployed on Google Cloud Run.

**Tech Stack:**
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS
- Backend: Express 4 + Node.js 22 + Firebase Admin
- Database: Supabase PostgreSQL (primary) or JSON files (legacy)
- Auth: Firebase Authentication (Google Sign-In)
- Deployment: Docker + Google Cloud Run

## File Organization

### Critical Files to Understand

```
source/
├── types.ts              # ALL type definitions - READ THIS FIRST
├── constants.ts          # App constants (ELO, ranks, presets)
├── App.tsx              # Main component - routing and state
├── server/index.js      # Server entry point
├── server/routes/       # API endpoints (modular)
└── components/          # UI components (20+ files)
```

### When to Edit What

| Task | Files to Modify |
|------|----------------|
| Add new API endpoint | `server/routes/*.js`, `services/storageService.ts` |
| Add new UI component | `components/*.tsx`, `App.tsx` (for routing) |
| Change data model | `types.ts`, database schema, migration script |
| Add new feature | Multiple files (see patterns below) |
| Fix bug | Locate via error message or component name |
| Update styling | Component files (Tailwind classes) |

## Common Patterns

### Pattern 1: Adding a New API Endpoint

**Steps:**
1. Create route handler in `server/routes/`
2. Add to `server/index.js` imports and middleware
3. Add client method in `services/storageService.ts`
4. Update TypeScript types if needed

**Example: Add "favorite player" feature**

```javascript
// 1. server/routes/favorites.js
import express from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/favorites', authMiddleware, async (req, res) => {
  try {
    const { playerId } = req.body;
    // Implementation here
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

// 2. server/index.js
import favoritesRoutes from './routes/favorites.js';
app.use('/api', favoritesRoutes);

// 3. services/storageService.ts
export async function addFavorite(playerId: string): Promise<void> {
  const token = await getAuthToken();
  const response = await fetch('/api/favorites', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ playerId })
  });
  if (!response.ok) throw new Error('Failed to add favorite');
}
```

### Pattern 2: Adding a New Component

**Steps:**
1. Create component file in `components/`
2. Import and use in `App.tsx` or parent component
3. Add to routing if it's a new tab
4. Update `Layout.tsx` if adding navigation

**Example: Add "Statistics" tab**

```typescript
// 1. components/Statistics.tsx
import React from 'react';
import { Player, Match } from '../types';

interface StatisticsProps {
  players: Player[];
  matches: Match[];
}

export default function Statistics({ players, matches }: StatisticsProps) {
  return (
    <div className="glass-panel p-6">
      <h2 className="text-2xl font-display text-cyber-cyan mb-4">
        Statistics
      </h2>
      {/* Component content */}
    </div>
  );
}

// 2. App.tsx
import Statistics from './components/Statistics';

// In renderContent():
if (activeTab === 'statistics') {
  return <Statistics players={players} matches={matches} />;
}

// 3. Layout.tsx (add tab)
const tabs = [
  // ... existing tabs
  { id: 'statistics', label: 'Statistics', icon: BarChart }
];
```

### Pattern 3: Modifying Data Model

**Steps:**
1. Update `types.ts` with new interface/field
2. Update Supabase schema (if using Supabase)
3. Update database operations in `server/db/`
4. Update API endpoints that return this data
5. Update components that display this data

**Example: Add "nickname" field to Player**

```typescript
// 1. types.ts
export interface Player {
  // ... existing fields
  nickname?: string; // Add this
}

// 2. Supabase migration (create new file)
ALTER TABLE players ADD COLUMN nickname TEXT;

// 3. server/db/operations.js (if using JSON mode)
// Update player creation/update logic

// 4. server/routes/players.js
router.put('/players/:id', authMiddleware, async (req, res) => {
  const { nickname } = req.body; // Accept new field
  // Update logic
});

// 5. components/PlayerProfile.tsx
<div className="text-gray-400">
  {player.nickname && `"${player.nickname}"`}
</div>
```

### Pattern 4: Adding Authentication Check

**Always use middleware for protected routes:**

```javascript
// User authentication required
router.post('/endpoint', authMiddleware, async (req, res) => {
  // req.user is available here
  const userId = req.user.uid;
});

// Admin authentication required
router.delete('/endpoint', authMiddleware, adminMiddleware, async (req, res) => {
  // Only admins can access
});
```

### Pattern 5: Error Handling

**Consistent error handling pattern:**

```typescript
// Frontend
try {
  await apiCall();
  showToast('Success!', 'success');
} catch (error) {
  console.error('Operation failed:', error);
  showToast(error.message || 'Operation failed', 'error');
}

// Backend
router.post('/endpoint', async (req, res) => {
  try {
    // Operation
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

## Code Generation Guidelines

### TypeScript Types

**Always use existing types from `types.ts`:**

```typescript
// Good
import { Player, Match, GameType } from '../types';

function processMatch(match: Match): void {
  // ...
}

// Bad - don't redefine types
interface MyMatch {
  id: string;
  // ...
}
```

### Component Structure

**Follow this template:**

```typescript
import React, { useState, useEffect } from 'react';
import { Player, Match } from '../types';
import { Icon1, Icon2 } from 'lucide-react';

interface ComponentProps {
  data: DataType[];
  onAction: (id: string) => void;
  isAdmin?: boolean;
}

export default function Component({ data, onAction, isAdmin = false }: ComponentProps) {
  const [localState, setLocalState] = useState<Type>(initialValue);

  useEffect(() => {
    // Side effects
  }, [dependencies]);

  const handleAction = async () => {
    try {
      await onAction(id);
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  if (data.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No data available
      </div>
    );
  }

  return (
    <div className="glass-panel p-6">
      <h2 className="text-2xl font-display text-cyber-cyan mb-4">
        Component Title
      </h2>
      {/* Content */}
    </div>
  );
}
```

### Styling Guidelines

**Use these Tailwind patterns:**

```typescript
// Container
<div className="glass-panel p-6">

// Heading
<h2 className="text-2xl font-display text-cyber-cyan mb-4">

// Button (primary)
<button className="px-4 py-2 bg-cyber-cyan text-black rounded-lg hover:bg-cyber-cyan/80 transition-colors">

// Button (secondary)
<button className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors">

// Button (danger)
<button className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors">

// Input
<input className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-cyber-cyan focus:outline-none" />

// Card
<div className="bg-white/5 border border-white/10 rounded-lg p-4">

// Grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

### API Client Pattern

**Always use `storageService.ts` for API calls:**

```typescript
// services/storageService.ts
export async function newApiCall(param: string): Promise<ReturnType> {
  const token = await getAuthToken();
  const response = await fetch('/api/endpoint', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ param })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Operation failed');
  }
  
  return response.json();
}
```

## Database Operations

### Supabase Mode

**Use the Supabase client:**

```javascript
import { supabase } from '../../lib/supabase.ts';

// Read
const { data, error } = await supabase
  .from('players')
  .select('*')
  .eq('id', playerId)
  .single();

// Insert
const { data, error } = await supabase
  .from('players')
  .insert({ name, avatar, elo_singles: 1200 })
  .select()
  .single();

// Update
const { error } = await supabase
  .from('players')
  .update({ elo_singles: newElo })
  .eq('id', playerId);

// Delete
const { error } = await supabase
  .from('players')
  .delete()
  .eq('id', playerId);
```

### JSON Mode

**Use the persistence layer:**

```javascript
import { loadDB, saveDB } from './db/persistence.js';

// Read
const db = await loadDB();
const player = db.players.find(p => p.id === playerId);

// Write
db.players.push(newPlayer);
await saveDB(db);
```

## Testing Approach

### Manual Testing Checklist

When implementing a feature, test:

1. **Happy path** - Feature works as expected
2. **Error cases** - Invalid inputs handled gracefully
3. **Edge cases** - Empty states, max values, etc.
4. **Permissions** - Auth/admin checks work
5. **UI responsiveness** - Works on mobile
6. **Data persistence** - Changes are saved

### Testing Locally

```bash
# Start dev servers
cd source
npm run dev

# Test in browser
open http://localhost:5173

# Check API directly
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/state
```

## Common Pitfalls

### ❌ Don't Do This

```typescript
// Don't redefine types
interface Player {
  id: string;
  name: string;
}

// Don't use inline styles
<div style={{ color: 'red' }}>

// Don't forget error handling
await apiCall(); // No try/catch

// Don't bypass authentication
router.post('/admin-action', async (req, res) => {
  // Missing authMiddleware and adminMiddleware
});

// Don't mutate state directly
players.push(newPlayer); // In React component

// Don't use var
var x = 5;

// Don't forget TypeScript types
function process(data) { // Missing types
```

### ✅ Do This Instead

```typescript
// Use existing types
import { Player } from '../types';

// Use Tailwind classes
<div className="text-red-400">

// Always handle errors
try {
  await apiCall();
} catch (error) {
  console.error(error);
}

// Use middleware
router.post('/admin-action', authMiddleware, adminMiddleware, async (req, res) => {

// Use setState
setPlayers([...players, newPlayer]);

// Use const/let
const x = 5;

// Add TypeScript types
function process(data: DataType): ReturnType {
```

## Debugging Tips

### Frontend Debugging

```typescript
// Add console logs
console.log('Player data:', player);
console.log('Match result:', { winners, losers, score });

// Check React DevTools
// - Component props
// - State values
// - Context values

// Check Network tab
// - API requests
// - Response status
// - Response body
```

### Backend Debugging

```javascript
// Add logging
console.log('[API] Request:', req.method, req.path);
console.log('[API] Body:', req.body);
console.log('[API] User:', req.user);

// Check server logs
// In Cloud Run: gcloud run services logs read SERVICE_NAME
// Locally: Check terminal output
```

### Common Issues

**"Cannot read property 'X' of undefined"**
- Check if data exists before accessing
- Use optional chaining: `player?.name`
- Add null checks: `if (player) { ... }`

**"401 Unauthorized"**
- Check Firebase token is being sent
- Verify token hasn't expired
- Check authMiddleware is working

**"ELO not updating"**
- Check if match is pending confirmation
- Verify ELO calculation logic
- Check database write succeeded

**"Component not rendering"**
- Check if data is loaded
- Verify component is imported
- Check conditional rendering logic

## Performance Considerations

### Frontend Optimization

```typescript
// Use React.memo for expensive components
export default React.memo(ExpensiveComponent);

// Use useMemo for expensive calculations
const sortedPlayers = useMemo(() => {
  return players.sort((a, b) => b.eloSingles - a.eloSingles);
}, [players]);

// Use useCallback for event handlers
const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);

// Debounce API calls
const debouncedSearch = debounce(searchPlayers, 300);
```

### Backend Optimization

```javascript
// Use indexes for queries
// Already configured in Supabase schema

// Batch operations
const updates = players.map(p => ({
  id: p.id,
  elo_singles: p.elo_singles + change
}));
await supabase.from('players').upsert(updates);

// Cache frequently accessed data
const cache = new Map();
if (cache.has(key)) return cache.get(key);
```

## Security Checklist

When adding features, ensure:

- [ ] Authentication required for protected endpoints
- [ ] Admin checks for admin-only operations
- [ ] Input validation on all user inputs
- [ ] SQL injection protection (use parameterized queries)
- [ ] XSS protection (React handles this automatically)
- [ ] CSRF protection (not needed for stateless JWT auth)
- [ ] Rate limiting (consider for production)
- [ ] Sensitive data not logged
- [ ] Firebase service account key not exposed

## Deployment Checklist

Before deploying:

- [ ] Code builds successfully (`npm run build`)
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] All features tested manually
- [ ] Environment variables configured
- [ ] Database migrations applied (if any)
- [ ] API endpoints documented
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Mobile responsive

## Quick Reference

### File Paths

```
Types: source/types.ts
Constants: source/constants.ts
API Client: source/services/storageService.ts
Auth: source/context/AuthContext.tsx
State: source/context/LeagueContext.tsx
Server: source/server/index.js
Routes: source/server/routes/*.js
Database: source/server/db/*.js
Components: source/components/*.tsx
```

### Key Functions

```typescript
// Get auth token
const token = await getAuthToken();

// Show toast notification
showToast('Message', 'success' | 'error');

// Refresh data
await refreshData();

// Calculate ELO
const change = calculateEloChange(winnerElo, loserElo);

// Format date
const formatted = new Date(timestamp).toLocaleDateString();
```

### Environment Variables

```bash
# Firebase (required)
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID

# Admin (required)
ADMIN_EMAILS=email1@example.com,email2@example.com

# Database (choose one)
USE_SUPABASE=true
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx

# Or
GCS_BUCKET=bucket-name
```

### Useful Commands

```bash
# Development
npm run dev

# Build
npm run build

# Deploy
gcloud run deploy SERVICE_NAME --source=.

# Logs
gcloud run services logs read SERVICE_NAME

# Database migration
npx tsx ../scripts/migrate-to-supabase.ts
```

## Getting Help

### Documentation

- Main README: `README.md`
- API Reference: `docs/API_REFERENCE.md`
- Database: `docs/DATABASE.md`
- Development: `docs/DEVELOPMENT.md`

### Code Examples

Look at existing implementations:
- Match logging: `components/MatchLogger.tsx`
- Player management: `components/PlayersHub.tsx`
- API routes: `server/routes/matches.js`
- Database ops: `server/db/operations.js`

### External Resources

- React: https://react.dev
- TypeScript: https://www.typescriptlang.org/docs
- Express: https://expressjs.com
- Supabase: https://supabase.com/docs
- Tailwind: https://tailwindcss.com/docs

## Summary

**Key Principles:**
1. Use existing types from `types.ts`
2. Follow established patterns
3. Add proper error handling
4. Use authentication middleware
5. Test thoroughly
6. Keep code simple and readable

**When in doubt:**
- Check existing similar code
- Read the type definitions
- Test locally before deploying
- Add console logs for debugging
- Ask for clarification if requirements are unclear

This codebase is well-structured and consistent. Follow the patterns you see, and you'll be productive quickly.
