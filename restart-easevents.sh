#!/bin/bash

PORT=8083
PROJECT_DIR="/Users/ugoumeano/GitHub/easeops"

cd "$PROJECT_DIR" || exit 1

PID=$(lsof -ti tcp:$PORT)

if [ ! -z "$PID" ]; then
  echo "Stopping existing process: $PID"
  kill $PID
  sleep 2
fi

npm run dev -- --host 127.0.0.1 --port $PORT
