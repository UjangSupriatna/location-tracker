# Location Tracker - Deployment Guide

## Environment Variables for Vercel

Set these environment variables in your Vercel dashboard:

```
DATABASE_URL="file:./db/custom.db"
NEXTAUTH_SECRET="your-super-secret-key-min-32-chars"
NEXTAUTH_URL="https://your-app-name.vercel.app"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

## Google OAuth Configuration

In Google Cloud Console (https://console.cloud.google.com):

### Authorized JavaScript origins:
```
https://your-app-name.vercel.app
```

### Authorized redirect URIs:
```
https://your-app-name.vercel.app/api/auth/callback/google
```

## Vercel Deployment Steps

1. Push code to GitHub repository
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

## Database

This app uses SQLite. For production on Vercel, consider using:
- Vercel Postgres
- Supabase
- PlanetScale
- Or any other database provider

Update `DATABASE_URL` and Prisma schema accordingly.

## Important Notes

- `NEXTAUTH_URL` must match your Vercel domain
- `NEXTAUTH_SECRET` should be at least 32 characters
- Google OAuth credentials must match the Vercel domain
