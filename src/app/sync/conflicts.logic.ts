export function shouldCreateConflict(params: {
  hasPendingLocalOp: boolean;
  localUpdatedAt: string | null;
  remoteUpdatedAt: string | null;
}): boolean {
  if (!params.hasPendingLocalOp) {
    return false;
  }
  if (!params.remoteUpdatedAt) {
    return false;
  }
  if (!params.localUpdatedAt) {
    return true;
  }
  return params.remoteUpdatedAt > params.localUpdatedAt;
}
