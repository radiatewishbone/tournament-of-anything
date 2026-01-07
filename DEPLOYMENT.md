# Deployment Guide

## Current Limitations

The application currently uses **in-memory storage**, which means:
- ❌ Data is lost when the server restarts
- ❌ Data is not shared across multiple server instances
- ❌ Tournaments disappear after deployment restarts

## Recommended Deployment Options

### Option 1: Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will auto-detect Next.js and configure build settings
   - Click "Deploy"

3. **Add Database (for persistence)**
   - Use Vercel Postgres, Vercel KV, or external database
   - Update `src/lib/database.ts` to use the database instead of in-memory Map

### Option 2: Netlify

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Deploy to Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Import your GitHub repository
   - Build command: `bun run build`
   - Publish directory: `.next`
   - Click "Deploy"

### Option 3: Self-Hosted with Docker

1. **Create Dockerfile**
   ```dockerfile
   FROM oven/bun:1 as base
   WORKDIR /app
   
   # Install dependencies
   COPY package.json bun.lock ./
   RUN bun install --frozen-lockfile
   
   # Copy source
   COPY . .
   
   # Build
   RUN bun run build
   
   # Expose port
   EXPOSE 3000
   
   # Start
   CMD ["bun", "start"]
   ```

2. **Build and Run**
   ```bash
   docker build -t blind-ranking .
   docker run -p 3000:3000 blind-ranking
   ```

## Making Data Persistent

To make tournaments persist, you need to replace the in-memory storage with a real database:

### Option A: Vercel KV (Redis)

```bash
bun add @vercel/kv
```

Update `src/lib/database.ts`:
```typescript
import { kv } from '@vercel/kv';

export async function createTournament(topic: string, items: any[]) {
  const id = generateId();
  const tournament = { id, topic, items, createdAt: new Date(), totalVotes: 0 };
  await kv.set(`tournament:${id}`, tournament);
  return tournament;
}

export async function getTournament(id: string) {
  return await kv.get(`tournament:${id}`);
}
```

### Option B: PostgreSQL with Prisma

```bash
bun add prisma @prisma/client
bunx prisma init
```

Create schema in `prisma/schema.prisma`:
```prisma
model Tournament {
  id         String   @id @default(cuid())
  topic      String
  items      Json
  createdAt  DateTime @default(now())
  totalVotes Int      @default(0)
}
```

### Option C: MongoDB

```bash
bun add mongodb
```

Update `src/lib/database.ts` to use MongoDB client.

## Environment Variables

For production deployments, set these environment variables:

```env
# Database (if using external DB)
DATABASE_URL=your_database_url

# Optional: Analytics
NEXT_PUBLIC_GA_ID=your_google_analytics_id

# Optional: Error tracking
SENTRY_DSN=your_sentry_dsn
```

## Performance Optimizations

1. **Enable Static Generation** where possible
2. **Add Image Optimization** for contender images
3. **Implement Caching** for leaderboard data
4. **Add Rate Limiting** to prevent abuse
5. **Use CDN** for static assets

## Security Considerations

1. **Add CORS protection** for API routes
2. **Implement rate limiting** on voting endpoints
3. **Add CAPTCHA** to prevent bot voting
4. **Sanitize user inputs** for topic and contender names
5. **Add authentication** for tournament management

## Monitoring

1. **Set up error tracking** (Sentry, LogRocket)
2. **Add analytics** (Google Analytics, Plausible)
3. **Monitor performance** (Vercel Analytics, New Relic)
4. **Track API usage** and rate limits

## Current Status

✅ Application builds successfully
✅ All routes are functional
✅ TypeScript type-safe
✅ ESLint passes
❌ No persistent storage (in-memory only)
❌ Not deployed to production
❌ No database configured

## Next Steps

1. Choose a deployment platform (Vercel recommended)
2. Add a database for persistence
3. Configure environment variables
4. Deploy and test
5. Set up monitoring and analytics
