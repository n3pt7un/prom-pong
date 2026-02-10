# Cyber-Pong Arcade League - User Guide

A comprehensive guide for using the Cyber-Pong Arcade League ping pong tracking application.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Your First Login](#your-first-login)
3. [Navigation](#navigation)
4. [Rankings & Leaderboard](#rankings--leaderboard)
5. [Logging Matches](#logging-matches)
6. [Player Profiles](#player-profiles)
7. [The Armory (Rackets)](#the-armory-rackets)
8. [Events & Competitions](#events--competitions)
   - [Tournaments](#tournaments)
   - [Challenges](#challenges)
   - [Hall of Fame](#hall-of-fame)
9. [Seasons](#seasons)
10. [Settings & Admin](#settings--admin)
11. [Troubleshooting](#troubleshooting)

---

## Getting Started

### What is Cyber-Pong?

Cyber-Pong Arcade League is a ping pong league management system with:
- **ELO rankings** for competitive play tracking
- **Player profiles** with stats, achievements, and history
- **Custom racket forging** with unique stats and cosmetics
- **Tournaments** for organized competitions
- **Challenges** for head-to-head wagers
- **Seasons** for tracked league play periods

### System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Google account (for sign-in)
- Internet connection

---

## Your First Login

### Signing In

1. Visit the application URL
2. Click **"Sign in with Google"**
3. Select your Google account
4. Grant permission for the app to access your basic profile info

### Setting Up Your Profile

On first login, you'll need to create your player profile:

1. **Choose a Username** -- This is how you'll appear on leaderboards (max 20 characters)
2. **Select an Avatar** -- Choose from presets or upload your own photo
3. **Add a Bio** (optional) -- A short description about yourself (max 150 characters)
4. **Claim an Existing Profile** (if available) -- If an admin created a profile for you, you can claim it instead of creating new

### Linking to an Existing Player

If you played before the Google authentication was added:
1. During profile setup, you'll see a list of "Unclaimed Players"
2. Click **"Claim"** next to your name
3. Your Google account will be linked to that player's history and stats

---

## Navigation

The app uses a bottom navigation bar (mobile) or top navigation bar (desktop):

| Tab | Icon | Description |
|-----|------|-------------|
| **Rankings** | Trophy | View leaderboards and recent matches |
| **Log Match** | Plus Circle | Record a new match result |
| **Players** | Users | Browse player profiles and stats |
| **Events** | Swords | Tournaments, challenges, and Hall of Fame |
| **Armory** | Sword | Create and manage rackets |
| **Settings** | Gear | Profile editing and admin tools |

**Badges**: The Events tab shows a badge with the count of pending match confirmations + active challenges requiring your attention.

---

## Rankings & Leaderboard

### Viewing Rankings

The Rankings tab shows:
- **Player of the Week** -- Top performer based on recent wins
- **Weekly Challenges** -- Current active challenges you can complete
- **Leaderboard** -- All players sorted by ELO rating
- **Pending Matches** -- Matches awaiting your confirmation
- **Recent Matches** -- Latest match results

### Understanding the Leaderboard

| Column | Description |
|--------|-------------|
| Rank | Position based on ELO |
| Player | Name, avatar, and rank badge |
| ELO | Singles ELO rating (primary ranking) |
| W/L | Wins and losses |
| Streak | Current win (+) or loss (-) streak |

### Rank Tiers

| Tier | ELO Range | Color |
|------|-----------|-------|
| NOOB | 0-1199 | Gray |
| PADDLER | 1200-1399 | Blue |
| HUSTLER | 1400-1599 | Purple |
| MASTER | 1600-1999 | Pink |
| GOD OF SPIN | 2000+ | Gold |

Click any player to view their full profile.

---

## Logging Matches

### Using Match Logger

1. Go to **Log Match** tab
2. Select game type: **Singles** (1v1) or **Doubles** (2v2)
3. Select **Winners** (1 player for singles, 2 for doubles)
4. Select **Losers** (1 player for singles, 2 for doubles)
5. Enter the **Score** (e.g., 11-7)
6. Click **"LOG MATCH"**

### Match Confirmation System

For fairness, matches require confirmation:

**As the logger:**
- Match appears as "Pending" until opponents confirm
- You can see the status in Recent Matches

**As an opponent:**
- Pending matches appear on the Rankings tab
- You have 24 hours to **Confirm** or **Dispute**
- If you don't respond, the match auto-confirms after 24 hours

**Disputing a Match:**
- Click **"Dispute"** if the result is incorrect
- An admin will review and resolve the dispute
- Disputed matches don't affect ELO until resolved

### Match Maker (Smart Suggestions)

Before logging, check the **Match Maker** section for suggested pairings:
- Shows balanced matchups based on ELO
- Click **"Use This Matchup"** to pre-fill the form
- Great for finding fair games

### Undoing a Match

After logging a confirmed match, you'll see an **"UNDO"** button in the toast notification. Click it within a few seconds to reverse the match and restore ELO.

---

## Player Profiles

### Viewing Profiles

Click any player name or avatar to view their profile:

**Profile Sections:**
- **Header** -- Avatar, name, rank badge, bio
- **Stats Cards** -- Singles ELO, Doubles ELO, Total Matches, Win Rate
- **Racket** -- Currently equipped racket with stats
- **Performance Chart** -- ELO history over time
- **Achievements** -- Earned badges

### Comparing Players

In the Players Hub, you can select two players to compare:
- Head-to-head record
- ELO comparison
- Win rate comparison
- Recent form

### Editing Your Profile

1. Go to **Settings** tab
2. Click **"Edit Profile"**
3. Update:
   - Username
   - Avatar (upload or choose preset)
   - Bio
4. Click **"Save Changes"**

### Equipping a Racket

1. Go to **Players** tab
2. Find your profile or click "Equip Racket"
3. Select from available rackets
4. Your equipped racket shows on your profile

---

## The Armory (Rackets)

### What Are Rackets?

Rackets are cosmetic items that represent your play style. Each racket has:
- **Name** (custom)
- **Icon** (20+ Lucide icons)
- **Color** (8 neon colors)
- **6 Stats** distributed across a 30-point budget

**Note**: Racket stats don't affect ELO calculations -- they're for fun and bragging rights!

### Stat Definitions

| Stat | Play Style |
|------|------------|
| **Speed** | Fast swings, quick serves |
| **Spin** | Curve shots, deceptive returns |
| **Power** | Hard smashes, aggressive play |
| **Control** | Precise placement, consistency |
| **Defense** | Blocking, long rallies |
| **Chaos** | Unpredictable, wild shots |

### Creating a Racket

1. Go to **Armory** tab
2. Click **"Forge New Racket"**
3. Choose:
   - **Name** -- Be creative!
   - **Icon** -- Visual representation
   - **Color** -- Neon accent color
   - **Stats** -- Distribute 30 points (0-20 per stat)
4. Click **"FORGE RACKET"**

**Tip**: Use the preset buttons (Speed Demon, The Wall, etc.) for quick builds!

### Editing Rackets

Any player can edit any racket:
1. Click the **pencil icon** on a racket card
2. Adjust name, icon, color, or stats
3. Click **"UPDATE RACKET"**

The stat budget is re-validated on every update.

---

## Events & Competitions

The Events tab contains competitive features: Tournaments, Challenges, and Hall of Fame.

---

### Tournaments

Create organized competitions with brackets!

#### Creating a Tournament (Admin only)

1. Go to **Events** tab
2. Scroll to **Tournaments** section
3. Click **"Create Tournament"**
4. Enter:
   - **Name** (e.g., "Winter Championship")
   - **Format**: Single Elimination or Round Robin
   - **Game Type**: Singles or Doubles
   - **Players**: Select participants
5. Click **"Create"**

#### Tournament Formats

**Single Elimination:**
- Bracket-style competition
- Lose once = eliminated
- Winner advances until champion crowned
- Byes automatically assigned for uneven player counts

**Round Robin:**
- Everyone plays everyone
- Most wins = champion
- Ties broken by head-to-head

#### Participating in Tournaments

1. View your matchup in the tournament bracket
2. Play your match
3. Winner clicks **"Submit Result"**
4. Enter the score
5. Result is recorded and bracket advances

---

### Challenges

Challenge other players to head-to-head matches with ELO wagers!

#### Sending a Challenge

1. Go to **Events** tab
2. Scroll to **Challenges** section
3. Click **"New Challenge"**
4. Select:
   - **Opponent** -- Who you're challenging
   - **Wager** -- Bonus ELO points at stake (0-50)
   - **Message** (optional) -- Taunt or context
5. Click **"Send Challenge"**

#### Responding to Challenges

When someone challenges you:
1. A badge appears on the Events tab
2. View the challenge in the Challenges section
3. Choose:
   - **Accept** -- Challenge becomes active
   - **Decline** -- Challenge expires

#### Completing a Challenge

1. Play your match
2. Log it through the normal Match Logger
3. The system detects the challenge matchup
4. Winner gets bonus ELO equal to the wager!
   - Normal ELO change still applies
   - Winner gains wager amount
   - Loser loses wager amount

**Example:**
- Wager: 20 points
- Normal ELO change: +16 / -16
- Challenge bonus: +20 / -20
- **Total: +36 for winner, -36 for loser**

---

### Hall of Fame

View historical records and achievements:
- All-time win leaders
- Highest ELO reached
- Longest win streaks
- Most matches played
- Previous season champions

---

## Seasons

Seasons organize play into tracked time periods.

### Understanding Seasons

**Active Season:**
- All matches count toward current season
- Live standings shown in Season Manager
- Champion determined when season ends

**Completed Seasons:**
- Archived standings preserved
- Historical reference for league history
- Shows who won each season

### Season Lifecycle (Admin)

**Starting a Season:**
1. Go to **Settings** tab
2. Scroll to **Season Manager**
3. Click **"Start New Season"**
4. Enter a name (e.g., "Spring 2024")
5. Season is now active

**Ending a Season:**
1. In Season Manager, click **"End Season"**
2. Final standings are calculated
3. Champion is determined
4. Season moves to "Completed"

**Viewing Past Seasons:**
- All completed seasons are listed
- Click to view final standings
- See who was champion and top rankings

---

## Settings & Admin

### Profile Settings

- **Edit Profile** -- Change name, avatar, bio
- **Sign Out** -- Log out of the app

### Admin Tools (Admin only)

If you're an admin, you have additional powers:

**User Management:**
- View all registered users
- Promote users to admin
- Demote admins (can't demote yourself)

**Data Management:**
- **Export Data** -- Download full league data as JSON
- **Import Data** -- Restore from backup (overwrites current)
- **Reset Season** -- Clear matches, reset ELO to 1200
- **Factory Reset** -- Restore demo data
- **Start Fresh** -- Delete everything for a clean slate

**Player Management:**
- Delete any player
- Rename any player
- Force-confirm disputed matches
- Create/delete tournaments
- Start/end seasons

---

## Achievements

Earn badges by reaching milestones:

| Achievement | How to Earn |
|-------------|-------------|
| **First Blood** | Play your first match |
| **On Fire** | Win 5 matches in a row |
| **Unstoppable** | Win 10 matches in a row |
| **Veteran** | Play 50 matches |
| **Century** | Play 100 matches |
| **Elo Climber** | Reach 1400 ELO |
| **Master** | Reach 1600 ELO |
| **Comeback Kid** | Win after losing 3+ in a row |

View your achievements on your player profile!

---

## Troubleshooting

### Can't Sign In

- Ensure popups are allowed for the site
- Check that your email is authorized in Firebase
- Try clearing browser cache

### Match Not Showing

- Check the **Pending Matches** section
- It may be awaiting confirmation
- Matches auto-confirm after 24 hours

### ELO Seems Wrong

- Remember: ELO only changes after match confirmation
- Doubles uses average team ELO
- Check your match history for details

### Can't Create Racket

- Ensure stats total exactly 30 points
- No single stat can exceed 20
- Name cannot be empty

### Challenge Not Working

- Both players must have active profiles
- Wager must be 0-50 points
- Challenge expires after 7 days

### Something Else?

Contact an admin or check the main README for technical troubleshooting.

---

## Tips for Success

1. **Log matches immediately** -- Don't wait, or you might forget the score
2. **Check the Match Maker** -- Find balanced games for fair ELO exchanges
3. **Equip a racket** -- Shows your play style and looks cool
4. **Accept challenges** -- Wagers add excitement and bonus points
5. **Confirm matches promptly** -- Keeps ELO up-to-date
6. **Check weekly challenges** -- Complete them for bragging rights
7. **Study opponents** -- View profiles to see their strengths

---

## Quick Reference

**Keyboard Shortcuts:**
- None currently (touch/mouse optimized)

**Data Refresh:**
- Auto-refreshes every 5 seconds
- Manual refresh by switching tabs

**Offline Indicator:**
- Red banner at top when connection lost
- App will reconnect automatically

**Toast Notifications:**
- Appear bottom-right for actions
- Include undo option for matches
- Auto-dismiss after 4-8 seconds

---

Enjoy the game! May your spin be tricky and your smashes unstoppable.
