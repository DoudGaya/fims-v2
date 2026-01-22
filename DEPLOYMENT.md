# CCSA Mobile API TypeScript - Deployment Guide

## Prerequisites

Before deploying to Vercel, ensure you have:

1. A PostgreSQL database (Vercel Postgres, Supabase, or other provider)
2. Firebase Admin credentials for mobile authentication
3. All required environment variables ready

## Environment Variables Setup

### Required Variables

These must be set in Vercel Project Settings → Environment Variables:

```bash
# Database - REQUIRED
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"

# NextAuth - REQUIRED
NEXTAUTH_URL="https://your-domain.vercel.app"
NEXTAUTH_SECRET="generate-a-random-secret-key-here"

# Firebase Admin - REQUIRED for mobile app authentication
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@your-project.iam.gserviceaccount.com"
FIREBASE_DATABASE_URL="https://your-project.firebaseio.com"
```

### Optional Variables

```bash
# Google OAuth (for SSO)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Email Service
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM=""

# SMS Service (Termii)
TERMII_API_KEY=""
TERMII_SENDER_ID="CCSA"
TERMII_BASE_URL="https://v3.api.termii.com"

# Supabase (if using)
SUPABASE_URL=""
SUPABASE_SERVICE_KEY=""
```

## Deployment Steps

### 1. Install Vercel CLI (if not already installed)

```bash
npm install -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

### 3. Link Your Project

```bash
cd ccsa-mobile-api-ts
vercel link
```

### 4. Set Environment Variables

You can set them via Vercel Dashboard or CLI:

```bash
# Via CLI
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
vercel env add FIREBASE_PROJECT_ID
# ... add all required variables
```

**Important for FIREBASE_PRIVATE_KEY:**
- In Vercel dashboard, paste the entire key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- Keep the `\n` characters as-is (they will be handled by the code)

### 5. Run Database Migrations

Before deploying, ensure your database schema is up to date:

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy
```

### 6. Deploy to Vercel

```bash
# Deploy to production
vercel --prod

# Or just deploy to preview
vercel
```

## Build Process

The build process will:

1. Run `postinstall` script → generates Prisma Client
2. Run `build` script → runs `prisma generate` again (for safety) then `next build`
3. Bundle all routes and API endpoints

## Troubleshooting

### Error: "Failed to collect page data"

This usually means:
- Environment variables are missing
- Prisma Client not generated properly
- Database connection failed during build

**Solution:**
- Ensure all REQUIRED env vars are set
- Check that `DATABASE_URL` is accessible from Vercel
- Review build logs in Vercel dashboard

### Error: "Firebase Admin not initialized"

**Solution:**
- Verify all Firebase env vars are set correctly
- Check that `FIREBASE_PRIVATE_KEY` includes the full key with headers
- Ensure no extra quotes or escaping in the private key

### Error: "Prisma Client not found"

**Solution:**
- This shouldn't happen with the updated build scripts
- If it does, try clearing build cache in Vercel
- Redeploy with "Clear Cache and Redeploy"

### Database Connection Issues

If the database is behind a firewall:
- Add Vercel's IP ranges to your database whitelist
- Or use a service like Vercel Postgres that's integrated

## Post-Deployment

### 1. Verify API Endpoints

Test key endpoints:
- `GET /api/health` - Health check
- `POST /api/auth/signin` - Authentication
- `GET /api/farmers` - Data retrieval

### 2. Run Database Seeds (if needed)

```bash
# SSH into a container or run locally with production DATABASE_URL
npx prisma db seed
```

### 3. Monitor Logs

- Check Vercel Function logs for errors
- Set up error tracking (Sentry, etc.) if configured

## Security Checklist

- ✅ All sensitive credentials in environment variables
- ✅ `NEXTAUTH_SECRET` is a strong random string
- ✅ Database has proper access controls
- ✅ Firebase service account has minimal required permissions
- ✅ CORS settings configured if needed
- ✅ Rate limiting enabled for sensitive endpoints

## Performance Tips

1. **Database Connection Pooling**: Use connection pooling in production
2. **Caching**: Consider Redis for session/cache storage
3. **CDN**: Static assets served via Vercel Edge Network
4. **Database Indexes**: Ensure proper indexes on frequently queried fields

## Rollback

If you need to rollback:

```bash
# Via Vercel Dashboard
# Go to Deployments → Find previous working deployment → Promote to Production

# Or via CLI
vercel rollback [deployment-url]
```

## Support

For issues:
1. Check Vercel deployment logs
2. Check database connectivity
3. Verify all environment variables are set
4. Review Firebase Admin configuration

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma with Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
