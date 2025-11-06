#!/bin/bash
# Database Backup Script for Film Festival Supabase Database
# This creates a full backup before running the migration

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/Users/morganharris/Film Festival/backups"
BACKUP_FILE="$BACKUP_DIR/festival_backup_$TIMESTAMP.sql"

# Create backups directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "============================================================"
echo "Film Festival Database Backup"
echo "============================================================"
echo "Starting backup at: $(date)"
echo "Backup file: $BACKUP_FILE"
echo ""

# Run pg_dump
# Note: You'll be prompted for the password (morganharris)
PGPASSWORD=morganharris pg_dump \
  -h db.xqzjthbearpqcrzfdfer.supabase.co \
  -U postgres \
  -d postgres \
  -F p \
  --clean \
  --if-exists \
  --verbose \
  -f "$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
  echo ""
  echo "============================================================"
  echo "✅ BACKUP SUCCESSFUL!"
  echo "============================================================"
  echo "Backup saved to: $BACKUP_FILE"
  echo "File size: $(du -h "$BACKUP_FILE" | cut -f1)"
  echo ""
  echo "To restore this backup later, run:"
  echo "psql -h db.xqzjthbearpqcrzfdfer.supabase.co -U postgres -d postgres -f \"$BACKUP_FILE\""
  echo "============================================================"
else
  echo ""
  echo "============================================================"
  echo "❌ BACKUP FAILED!"
  echo "============================================================"
  echo "Please check the error messages above."
  exit 1
fi
