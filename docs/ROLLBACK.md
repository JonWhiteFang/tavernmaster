# Rollback Procedures

This document describes how to recover from failed migrations or corrupted state.

## Automatic Backups

TavernMaster creates automatic backups before each migration:

- Location: `{app_data_dir}/backups/`
- Naming: `pre-migration-v{from}-to-v{to}-{timestamp}.db`
- Retention: Last 20 backups kept

## Manual Backup

Before major operations, create a manual backup:

```bash
# Via app: Settings → Advanced → Create Backup
# Or copy the database file directly:
cp ~/Library/Application\ Support/com.tavernmaster.app/tavernmaster.db ~/Desktop/backup.db
```

## Restore from Backup

### Via App UI

1. Open Settings → Advanced
2. Click "Restore from Backup"
3. Select the backup file
4. Confirm restore (app will restart)

### Manual Restore

1. Quit TavernMaster completely
2. Replace the database:
   ```bash
   cp ~/Desktop/backup.db ~/Library/Application\ Support/com.tavernmaster.app/tavernmaster.db
   ```
3. Restart the app

## Migration Failure Recovery

If a migration fails:

1. **Automatic Recovery**: The app shows a Recovery screen with options:
   - "Restore Backup" - restores the pre-migration backup
   - "Retry" - attempts the migration again

2. **Manual Recovery**: If the app won't start:
   - Find the latest backup in the backups directory
   - Manually restore as described above

## Campaign Recovery

### Undo Last Turn

- Use ⌘Z or Edit → Undo Turn
- Restores state to previous turn's snapshot
- Turn is marked "undone" (not deleted)

### Branch from Turn

- Use ⌘⇧B or Edit → Branch Campaign
- Creates a new campaign from any turn's snapshot
- Original campaign unchanged

### Import from Bundle

- Export bundles include full campaign state
- Import creates a new campaign (no conflicts)

## Data Corruption

If you suspect data corruption:

1. **Export affected campaigns** as bundles (if possible)
2. **Create a full backup** of the database
3. **Report the issue** via GitHub with:
   - Steps to reproduce
   - Error messages (redacted)
   - App version and macOS version

## Prevention

- Don't force-quit during saves
- Keep automatic backups enabled
- Export important campaigns periodically
- Use FileVault for disk encryption
