# Admin Panel Implementation & Seasons Fix

## Summary

This implementation adds a comprehensive admin panel and fixes critical issues with the seasons functionality.

## Changes Made

### 1. Database Schema Fixes (`supabase/migrations/009_fix_seasons_and_admin.sql`)

**Fixed Missing Columns:**
- Added `wins_singles`, `losses_singles`, `streak_singles` to players table
- Added `wins_doubles`, `losses_doubles`, `streak_doubles` to players table
- Added `league_id` to players table
- Added `season_id`, `is_friendly`, `match_format` to matches table

**New Tables:**
- `leagues` - League management
- `correction_requests` - Match correction requests
- `archived_matches` - Historical match data from completed seasons
- `archived_match_players` - Junction table for archived matches

**New Functions:**
- `archive_season_matches(p_season_id)` - Archives matches when a season ends
- `admin_stats` view - Dashboard statistics for admin panel

### 2. Seasons Functionality Fixes

**Issues Fixed:**
- ✅ Matches now track which season they belong to via `seasonId`
- ✅ Season start creates season BEFORE clearing matches (prevents data loss)
- ✅ Season end only counts matches from that specific season
- ✅ Matches are archived before being cleared when starting new season
- ✅ Season standings now use split singles/doubles stats

**Updated Files:**
- `source/server/routes/seasons.js` - Fixed season start/end logic
- `source/server/routes/matches.js` - Added seasonId to match creation
- `source/server/db/operations.js` - Added archiving and admin functions
- `source/server/db/mappers.js` - Added seasonId to match mapping
- `source/types.ts` - Added seasonId to Match interface

### 3. Comprehensive Admin Panel

**New Admin Routes (`source/server/routes/admin.js`):**
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/users` - List all users with admin status
- `PUT /api/admin/users/:playerId` - Update user details
- `DELETE /api/admin/users/:playerId` - Delete user
- `GET /api/admin/admins` - List all admins
- `POST /api/admin/admins` - Add new admin
- `DELETE /api/admin/admins/:firebaseUid` - Remove admin
- `GET /api/admin/matches` - List all matches with details
- `DELETE /api/admin/matches/:matchId` - Delete match
- `GET /api/admin/leagues` - List all leagues
- `POST /api/admin/leagues` - Create league
- `PUT /api/admin/leagues/:leagueId` - Update league
- `DELETE /api/admin/leagues/:leagueId` - Delete league
- `GET /api/admin/seasons` - List all seasons
- `DELETE /api/admin/seasons/:seasonId` - Delete season

**New Admin Panel Component (`source/components/AdminPanel.tsx`):**
- Overview tab with statistics dashboard
- Users tab for managing players and their details
- Matches tab for viewing and deleting matches
- Leagues tab for creating/editing/deleting leagues
- Seasons tab for viewing season history
- Admins tab for managing admin users

**Tab Components:**
- `source/components/admin/UsersTab.tsx` - User management
- `source/components/admin/MatchesTab.tsx` - Match management
- `source/components/admin/LeaguesTab.tsx` - League management
- `source/components/admin/SeasonsTab.tsx` - Season management
- `source/components/admin/AdminsTab.tsx` - Admin management

### 4. Settings Component Simplification

**Removed from Settings (now in Admin Panel):**
- User management
- League management (inline)
- Player management
- Match management
- Recalculate stats
- Season reset
- Factory reset
- Import functionality
- Backup management
- Correction requests

**Kept in Settings:**
- User profile editing (avatar, name, bio)
- Export data functionality
- Note directing admins to Admin Panel

### 5. UI Integration

**Layout Component (`source/components/Layout.tsx`):**
- Added "Admin Panel" button in header for admin users
- Button replaces the static admin badge on desktop
- Opens the comprehensive admin panel modal

**App Component (`source/App.tsx`):**
- Added `showAdminPanel` state
- Integrated AdminPanel component
- Updated Settings to only show user-facing features
- League and Season managers now only show for admins in settings tab

### 6. Type Definitions

**Added to `source/types.ts`:**
```typescript
interface AdminStats {
  totalPlayers: number;
  totalMatches: number;
  activeSeasons: number;
  completedSeasons: number;
  totalLeagues: number;
  pendingMatches: number;
  pendingCorrections: number;
  totalAdmins: number;
}

interface AdminUser {
  id: string;
  firebaseUid: string;
  email?: string;
  displayName?: string;
  createdAt: string;
}
```

## How to Use

### For Admins:
1. Click the "Admin Panel" button in the header
2. Navigate through tabs to manage different aspects:
   - **Overview**: View system statistics
   - **Users**: Edit player details, ELO, stats, delete users
   - **Matches**: View all matches, delete matches
   - **Leagues**: Create, edit, delete leagues
   - **Seasons**: View season history, delete old seasons
   - **Admins**: Add or remove admin privileges

### For Regular Users:
- Settings tab now only shows profile editing and export
- Cleaner, simpler interface
- Admin features are hidden

## Database Migration

Run the new migration to add missing columns and tables:

```bash
# If using Supabase
supabase db push

# Or apply the migration manually
psql -f supabase/migrations/009_fix_seasons_and_admin.sql
```

## Testing Checklist

- [ ] Start a new season - verify matches are cleared
- [ ] Log matches during a season - verify seasonId is set
- [ ] End a season - verify match count is correct
- [ ] View completed season - verify standings are saved
- [ ] Open Admin Panel - verify all tabs load
- [ ] Edit user in Admin Panel - verify changes save
- [ ] Delete match in Admin Panel - verify it's removed
- [ ] Create league in Admin Panel - verify it appears
- [ ] Add/remove admin - verify permissions update
- [ ] Regular user settings - verify admin features are hidden

## Notes

- The old Settings component is backed up as `Settings.old.tsx`
- Admin routes are already registered in `source/server/index.js`
- All admin operations require authentication and admin middleware
- Seasons now properly track and archive matches
- Database schema is now complete with all necessary columns
