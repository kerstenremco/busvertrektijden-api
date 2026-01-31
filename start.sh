#!/bin/sh
set -e

SERVER_CMD=${SERVER_CMD:-server}

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting: $SERVER_CMD"
npm run "$SERVER_CMD"


