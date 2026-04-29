#!/bin/bash
cd /workspaces/gst-saathi/apex-agisolutions
pkill -9 -f "next dev" 2>/dev/null
pkill -9 -f "inngest-cli" 2>/dev/null
sleep 2

exec node_modules/.bin/next dev
