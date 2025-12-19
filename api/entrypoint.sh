#!/bin/bash
set -e

if [[ "$1" == "worker" ]]; then
    echo "Starting worker..."
    npm run server:worker
else
    echo "Running migrations..."
    npx prisma migrate deploy
    echo "Starting server..."
    npm run server
fi