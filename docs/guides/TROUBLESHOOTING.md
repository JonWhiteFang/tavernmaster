# Troubleshooting Guide

## Sync Issues

### "Supabase not configured"

**Cause**: Missing environment variables.

**Fix**: Create `.env` file with:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### "Not signed in"

**Cause**: No active Supabase session.

**Fix**: Go to `Settings → Sync & SRD` and sign in with email/password.

### Sync conflicts appearing

**Cause**: Local changes collided with remote changes while offline.

**Fix**:

1. Go to `Settings → Sync & SRD`
2. Review each conflict
3. Choose "Keep Local" or "Keep Remote" for each

### Data not syncing

**Possible causes**:

- Network connectivity issues
- Supabase project paused (free tier)
- RLS policy blocking access

**Debug steps**:

1. Check browser console for errors
2. Verify Supabase project is active
3. Ensure migrations are applied (both schema and RLS)

## LLM Connection Issues

### "Connection failed" or timeout

**Cause**: LLM server not running or wrong URL.

**Fix**:

1. Verify Ollama/LM Studio is running
2. Check base URL in `Settings → LLM Runtime`
   - Ollama default: `http://localhost:11434`
   - LM Studio: Check their server settings
3. Test with: `curl http://localhost:11434/api/tags`

### "Model not found"

**Cause**: Requested model not installed.

**Fix**:

- Ollama: `ollama pull llama3.1:8b`
- LM Studio: Download model from their UI

### Slow or no response

**Cause**: Model too large for available RAM/VRAM.

**Fix**: Use a smaller model (e.g., `llama3.1:8b` instead of `70b`).

## Database Issues

### App won't start / crashes on launch

**Possible cause**: Corrupted database.

**Fix**:

1. Locate database: `~/Library/Application Support/com.tavernmaster.app/tavernmaster.db`
2. Back up the file
3. Delete it to start fresh (data loss)
4. Or restore from Supabase sync if configured

### Missing data after update

**Cause**: Schema migration may have failed.

**Fix**: The app auto-runs migrations on startup. Check console for errors. If needed, delete database and re-sync from Supabase.

### "deleted_at" data still showing

**Cause**: Bug in older version (fixed in Plan 5).

**Fix**: Update to latest version; soft-deleted rows are now filtered.

## Character Creation Issues

### Can't save character

**Possible causes**:

- Point buy budget exceeded (max 27 points)
- Missing required fields
- Duplicate ancestry bonus selections (Half-Elf)

**Fix**: Check validation messages in the wizard.

### Stats not calculating correctly

**Cause**: Auto-calc may be disabled or ancestry bonuses not applied.

**Fix**:

1. Ensure "Auto-calculate" is enabled
2. Click "Recalculate Stats" to reset to SRD defaults
3. Verify ancestry bonus selections are correct

### Starting equipment missing

**Cause**: Class may not have `startingItemIds` defined.

**Fix**: All 12 SRD classes should have starting equipment. If missing, report as bug.

## Encounter Issues

### Initiative order not saving

**Cause**: Fixed in Implementation Plan 5 (PR 2.1).

**Fix**: Update to latest version.

### Encounter not refreshing after turn advance

**Cause**: Fixed in Implementation Plan 5 (PR 6.1).

**Fix**: Update to latest version.

### Crash recovery not working

**Cause**: Snapshot may be corrupted or missing.

**Fix**:

1. Check `app_settings` for `encounter_recovery` key
2. Start a new encounter if recovery fails

## UI Issues

### Dark theme not applying

**Cause**: CSS variables not loading.

**Fix**: Hard refresh (`Cmd+Shift+R`) or restart app.

### Tutorial won't dismiss

**Fix**: Go to `Settings → Tutorial` and click "Skip Tutorial".

### Panels not resizing

**Cause**: CSS flexbox issue.

**Fix**: Resize window or restart app.

## Development Issues

### Tests failing after changes

**Common causes**:

- Missing mock for `withTransaction`
- Missing mock for new database columns
- Async timing issues

**Fix for transaction mock**:

```typescript
vi.mock("./db", () => ({
  getDatabase: async () => fakeDb,
  withTransaction: async <T>(fn: (db: FakeDb) => Promise<T>): Promise<T> => fn(fakeDb)
}));
```

### Build fails

**Check**:

1. `npm run lint` - Fix ESLint errors
2. `npm run format` - Fix formatting
3. TypeScript errors in IDE

### Tauri build fails

**Common causes**:

- Rust toolchain not installed
- Missing Xcode Command Line Tools (macOS)

**Fix**:

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Xcode CLT
xcode-select --install
```

## Getting Help

1. Check existing issues on GitHub
2. Search this troubleshooting guide
3. Review relevant documentation in `docs/`
4. Open a new issue with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Console errors (if any)
   - App version and macOS version
