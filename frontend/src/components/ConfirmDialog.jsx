import { AlertCircle } from 'lucide-react';

/**
 * ConfirmDialog — Modal de confirmation réutilisable.
 *
 * Usage:
 *   <ConfirmDialog
 *     open={showConfirm}
 *     title="Supprimer cet utilisateur ?"
 *     message="Cette action est irréversible."
 *     confirmLabel="Supprimer"
 *     danger
 *     onConfirm={handleDelete}
 *     onCancel={() => setShowConfirm(false)}
 *   />
 */
export default function ConfirmDialog({
  open,
  title = 'Confirmer',
  message = 'Êtes-vous sûr ?',
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  danger = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: 380 }}>
        <AlertCircle
          size={36}
          color={danger ? 'var(--color-error)' : 'var(--color-primary)'}
          style={{ margin: '0 auto 16px' }}
        />
        <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>
          {title}
        </h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 24 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-ghost" onClick={onCancel}>{cancelLabel}</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
