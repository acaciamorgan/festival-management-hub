#!/bin/bash
# Run Phase 2 Migration - Add Free-Text Description Fields

echo "============================================================"
echo "PHASE 2: Adding Free-Text Description Fields"
echo "============================================================"
echo "This script will add new columns to photo_shoots, red_carpets,"
echo "and special_events tables."
echo ""
echo "IMPORTANT: This ONLY adds new empty columns."
echo "No existing data will be modified or deleted."
echo ""
echo "Starting at: $(date)"
echo ""

# Run the SQL file
PGPASSWORD=morganharris psql \
  -h db.xqzjthbearpqcrzfdfer.supabase.co \
  -U postgres \
  -d postgres \
  -f phase2-add-fields.sql

# Check if successful
if [ $? -eq 0 ]; then
  echo ""
  echo "============================================================"
  echo "✅ PHASE 2 COMPLETE!"
  echo "============================================================"
  echo "New columns added successfully."
  echo "All existing data remains intact."
  echo "Ready for Phase 3 (create junction tables)."
  echo "============================================================"
else
  echo ""
  echo "============================================================"
  echo "❌ PHASE 2 FAILED!"
  echo "============================================================"
  echo "Please check the error messages above."
  echo "No data was modified - safe to retry."
  exit 1
fi
