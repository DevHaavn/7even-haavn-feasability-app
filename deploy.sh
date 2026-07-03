#!/bin/bash
# Push to GitHub + deploy to Vercel in one step
set -e

echo "→ Pushing to GitHub..."
git push origin main

echo "→ Deploying to Vercel..."
npx vercel deploy --prod --yes

echo "✓ Done — live in ~60 seconds"
