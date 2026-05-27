// ConfirmModal does NOT use useBodyScrollLock
// Parent modal already handles scroll lock
export default function ConfirmModal({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmClass = 'btn-danger',
  icon = '⚠️',
  onConfirm,
  onCancel,
  loading = false,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div
        className="modal-box p-6"
        style={{ maxWidth: '420px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center mb-5">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-3"
            style={{ backgroundColor: 'var(--bg-card2)' }}
          >
            {icon}
          </div>
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h3>
          {message && (
            <p className="text-sm mt-1.5" style={{ color: 'var(--text-muted)' }}>
              {message}
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button className="btn-secondary flex-1" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button className={`${confirmClass} flex-1`} onClick={onConfirm} disabled={loading}>
            {loading ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
