# Blind Ranking - ELO Tournament Application

A Next.js web application that enables crowd-sourced rankings through ELO-based voting tournaments. Create tournaments on any topic, share voting links, and view live leaderboards.

## Features

### 🎯 Creator View
- Enter any topic to create a tournament
- Auto-generate 16 default contenders based on the topic
- Edit contender names and image URLs
- Generate unique shareable tournament URLs

### ⚔️ Voting Arena
- Split-screen comparison interface
- Click to vote for your favorite
- Real-time ELO score updates
- Progress tracking
- Continuous voting loop with random pairings

### 🏆 Live Leaderboard
- Real-time ranking updates
- Visual bar charts showing relative scores
- Win/loss statistics
- Win rate percentages
- Medal indicators for top 3
- Auto-refresh every 3 seconds

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **React**: 19.1.0
- **Styling**: Tailwind CSS v4 (Dark Mode)
- **TypeScript**: Full type safety
- **Package Manager**: Bun
- **ELO Algorithm**: K-factor 32 for dynamic ratings

## Getting Started

### Installation

```bash
# Install dependencies
bun install
```

### Development

**Note**: This is a sandboxed environment. Do not run `next dev` or `bun dev`.

### Build

```bash
# Build the production application
bun build
```

### Linting

```bash
# Run ESLint
bun lint
```

## How It Works

### ELO Rating System

The application uses the ELO rating system (commonly used in chess) to rank items:

1. **Initial Score**: All items start with 1500 ELO points
2. **Expected Score**: Calculated based on rating difference between two items
3. **Score Update**: Winner gains points, loser loses points based on expected outcome
4. **K-Factor**: Set to 32 for dynamic, responsive ratings

### User Flow

1. **Create Tournament**
   - Enter a topic (e.g., "Best Office Snacks")
   - Review/edit the 16 generated contenders
   - Click "Create Tournament" to get a shareable URL

2. **Vote**
   - Visit the tournament URL
   - Choose between two randomly selected items
   - Vote as many times as you want
   - Watch your progress bar fill up

3. **View Results**
   - Click "See Results" from the voting page
   - View live rankings sorted by ELO score
   - Share the voting link to get more participants

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── tournament/route.ts  # Create tournament endpoint
│   │   └── vote/route.ts        # Process vote endpoint
│   ├── vote/[id]/page.tsx       # Voting arena
│   ├── results/[id]/page.tsx    # Leaderboard
│   ├── page.tsx                 # Home/Creator view
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Global styles
├── lib/
│   ├── types.ts                 # TypeScript interfaces
│   ├── database.ts              # In-memory data storage
│   ├── elo.ts                   # ELO algorithm
│   └── contenders.ts            # Default contender generator
└── components/                  # Reusable components (future)
```

## Design Principles

- **Dark Mode First**: High contrast, modern aesthetic
- **Mobile Responsive**: Vertical stacking on mobile, side-by-side on desktop
- **Progressive Enhancement**: Works without JavaScript for basic functionality
- **Accessibility**: Semantic HTML, keyboard navigation support

## Future Enhancements

- [ ] Persistent database (PostgreSQL/MongoDB)
- [ ] User authentication
- [ ] Tournament history and analytics
- [ ] Social sharing features
- [ ] Custom ELO parameters per tournament
- [ ] Image upload functionality
- [ ] Tournament categories and discovery
- [ ] Export results as images/PDFs

## Contributing

This project follows Next.js best practices:
- Server Components by default
- Client Components only when needed (marked with "use client")
- API routes for data mutations
- Utilities in `src/lib/` for shared logic

## License

MIT

---

Built with ❤️ using Next.js 15 and Tailwind CSS v4
