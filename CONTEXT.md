# Blind Ranking - ELO Tournament Application

## Project Overview
A Next.js web application that enables crowd-sourced rankings through ELO-based voting tournaments. Users can create tournaments on any topic, share voting links, and view live leaderboards.

## Purpose
Enable communities to democratically rank items (snacks, movies, products, etc.) through head-to-head comparisons using the proven ELO rating system.

## Key Features

### 1. Creator View (Home Page)
- Topic input for tournament creation
- Auto-generation of 16 default contenders
- Manual editing of contender list (name + image URL)
- Tournament generation with unique shareable URLs

### 2. Voting View (Arena)
- Split-screen comparison interface (Item A vs Item B)
- ELO-based score updates on each vote
- Continuous voting loop with random pairings
- Progress tracking for user engagement

### 3. Results View (Leaderboard)
- Live ranking display sorted by ELO score
- Visual representation with bar charts
- Movement indicators (up/down arrows)

## Technical Stack
- **Framework**: Next.js 15 (App Router)
- **React**: 19.1.0
- **Styling**: Tailwind CSS v4
- **TypeScript**: Full type safety
- **Package Manager**: Bun
- **Database**: In-memory storage (can be upgraded to persistent DB)

## Architecture Decisions

### Data Storage
Using in-memory storage for simplicity in sandboxed environment. Structure:
- Tournaments: Map of tournament ID to tournament data
- Items: Each tournament contains items with ELO scores
- Initial ELO score: 1500 (standard starting point)

### ELO Algorithm
- K-factor: 32 (standard for dynamic ratings)
- Expected score formula: 1 / (1 + 10^((opponentRating - playerRating) / 400))
- New rating: currentRating + K * (actualScore - expectedScore)

### Routing Structure
- `/` - Creator view (home page)
- `/vote/[id]` - Voting arena for specific tournament
- `/results/[id]` - Leaderboard for specific tournament

## Design Principles
- **Dark Mode First**: High contrast, modern aesthetic
- **Mobile Responsive**: Vertical stacking on mobile, side-by-side on desktop
- **Progressive Enhancement**: Works without JavaScript for basic functionality
- **Accessibility**: Semantic HTML, keyboard navigation support

## Project Conventions
- Server Components by default
- Client Components only when interactivity needed (marked with "use client")
- API routes in `src/app/api/` for data mutations
- Utilities in `src/lib/` for shared logic
- Components in `src/components/` for reusability

## Future Enhancements
- Persistent database (PostgreSQL/MongoDB)
- User authentication
- Tournament history and analytics
- Social sharing features
- Custom ELO parameters per tournament
