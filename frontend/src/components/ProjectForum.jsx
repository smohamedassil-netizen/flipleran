import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api.js';
import { formatFullName } from '../utils/format.js';
import {
  MessageSquare, Pin, PinOff, CheckCircle, Send, Plus, X, Trash2,
  Megaphone, HelpCircle, Sparkles, Loader,
} from 'lucide-react';

/**
 * ProjectForum — Forum asynchrone d'un projet (F9 sprint-final).
 *
 * Cadre théorique : Garrison-Anderson-Archer 2000, Community of Inquiry.
 * Les échanges asynchrones structurés soutiennent la présence sociale et
 * cognitive en e-learning.
 *
 * Props :
 *  - projectId : id du projet parent
 *  - canPin : true si l'utilisateur peut épingler/dépinger (prof ou admin)
 *  - canAnnounce : true si l'utilisateur peut créer une annonce
 *  - currentUserId : pour distinguer "mon thread"/"thread d'un autre"
 */

const TYPE_META = {
  question:     { label: 'Question',     Icon: HelpCircle, color: '#0891b2', bg: '#ecfeff' },
  announcement: { label: 'Annonce',      Icon: Megaphone,  color: '#dc2626', bg: '#fef2f2' },
  sharing:      { label: 'Partage',      Icon: Sparkles,   color: '#059669', bg: '#ecfdf5' },
};

function ThreadCard({ thread, projectId, canPin, currentUserId, onUpdated }) {
  const [expanded, setExpanded] = useState(false);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  const meta = TYPE_META[thread.type] || TYPE_META.question;
  const Icon = meta.Icon;
  const isAuthor = String(thread.authorId?._id ?? thread.authorId) === String(currentUserId);
  const canDelete = isAuthor || canPin;

  const togglePin = async () => {
    setBusy(true);
    try {
      await api.patch(`/projects/${projectId}/threads/${thread._id}`, { pinnedByProf: !thread.pinnedByProf });
      onUpdated?.();
    } catch (err) { console.error(err); }
    finally { setBusy(false); }
  };

  const toggleResolved = async () => {
    setBusy(true);
    try {
      await api.patch(`/projects/${projectId}/threads/${thread._id}`, { isResolved: !thread.isResolved });
      onUpdated?.();
    } catch (err) { console.error(err); }
    finally { setBusy(false); }
  };

  const handleReply = async () => {
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await api.post(`/projects/${projectId}/threads/${thread._id}/replies`, { content: reply.trim() });
      setReply('');
      onUpdated?.();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la réponse.');
    } finally { setBusy(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer ce thread et toutes ses réponses ?')) return;
    setBusy(true);
    try {
      await api.delete(`/projects/${projectId}/threads/${thread._id}`);
      onUpdated?.();
    } catch (err) { console.error(err); }
    finally { setBusy(false); }
  };

  return (
    <div
      style={{
        padding: 14,
        background: thread.pinnedByProf ? '#fef3c7' : 'white',
        border: `1px solid ${thread.pinnedByProf ? '#fde68a' : '#e2e8f0'}`,
        borderRadius: 10,
        marginBottom: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: meta.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={15} color={meta.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 13.5, color: '#1e293b' }}>{thread.title}</strong>
            <span style={{ padding: '1px 7px', fontSize: 10, fontWeight: 700, color: meta.color, background: meta.bg, borderRadius: 999 }}>
              {meta.label.toUpperCase()}
            </span>
            {thread.pinnedByProf && (
              <span title="Épinglé par le prof" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 7px', fontSize: 10, fontWeight: 700, color: '#92400e', background: '#fef3c7', borderRadius: 999 }}>
                <Pin size={9} /> ÉPINGLÉ
              </span>
            )}
            {thread.isResolved && (
              <span title="Question résolue" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 7px', fontSize: 10, fontWeight: 700, color: '#059669', background: '#ecfdf5', borderRadius: 999 }}>
                <CheckCircle size={9} /> RÉSOLU
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            {formatFullName(thread.authorId) || 'Anonyme'} · {new Date(thread.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {canPin && (
            <button onClick={togglePin} disabled={busy} title={thread.pinnedByProf ? 'Désépingler' : 'Épingler'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
              {thread.pinnedByProf ? <PinOff size={14} /> : <Pin size={14} />}
            </button>
          )}
          {(isAuthor || canPin) && thread.type === 'question' && (
            <button onClick={toggleResolved} disabled={busy} title={thread.isResolved ? 'Marquer non résolu' : 'Marquer résolu'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: thread.isResolved ? '#059669' : '#64748b', padding: 4 }}>
              <CheckCircle size={14} />
            </button>
          )}
          {canDelete && (
            <button onClick={handleDelete} disabled={busy} title="Supprimer" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 4 }}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
        {thread.content}
      </div>

      {/* Replies */}
      {thread.replies?.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
          {!expanded && thread.replies.length > 1 ? (
            <button
              onClick={() => setExpanded(true)}
              style={{ fontSize: 12, color: '#0891b2', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}
            >
              💬 Voir {thread.replies.length} réponse{thread.replies.length > 1 ? 's' : ''}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {thread.replies.map((r, i) => (
                <div key={r._id || i} style={{
                  padding: '8px 12px',
                  background: r.isFromProf ? '#eff6ff' : '#f8fafc',
                  border: r.isFromProf ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                  borderRadius: 8,
                }}>
                  <div style={{ fontSize: 11, color: r.isFromProf ? '#1e40af' : '#64748b', fontWeight: 600, marginBottom: 4 }}>
                    {r.isFromProf && <span style={{ marginRight: 4 }}>👨‍🏫 Prof</span>}
                    {formatFullName(r.authorId) || 'Anonyme'} · {new Date(r.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ fontSize: 12.5, color: '#1e293b', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{r.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reply form */}
      <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
        <input
          type="text"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleReply()}
          placeholder="Répondre…"
          style={{ flex: 1, padding: '6px 10px', fontSize: 12.5, border: '1px solid #e2e8f0', borderRadius: 6 }}
        />
        <button onClick={handleReply} disabled={busy || !reply.trim()} className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Send size={12} />
        </button>
      </div>
    </div>
  );
}

export default function ProjectForum({ projectId, canPin, canAnnounce, currentUserId }) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [newThread, setNewThread] = useState({ title: '', content: '', type: 'question' });
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter === 'all' ? {} : { type: filter };
      const { data } = await api.get(`/projects/${projectId}/threads`, { params });
      setThreads(data.threads || []);
    } catch (e) {
      setErr(e.response?.data?.message || 'Erreur de chargement.');
    } finally { setLoading(false); }
  }, [projectId, filter]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newThread.title.trim() || !newThread.content.trim()) return;
    setCreating(true);
    setErr('');
    try {
      await api.post(`/projects/${projectId}/threads`, newThread);
      setNewThread({ title: '', content: '', type: 'question' });
      setShowCreate(false);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Erreur lors de la création.');
    } finally { setCreating(false); }
  };

  return (
    <section className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageSquare size={17} color="#0891b2" />
          Forum du projet
        </h3>
        <button onClick={() => setShowCreate(!showCreate)} className="btn btn-primary btn-sm">
          <Plus size={13} /> Nouveau thread
        </button>
      </div>

      {/* Filtres par type */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {[
          { k: 'all', label: 'Tous' },
          { k: 'question', label: '❓ Questions' },
          { k: 'announcement', label: '📢 Annonces' },
          { k: 'sharing', label: '✨ Partages' },
        ].map((f) => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k)}
            style={{
              padding: '4px 10px', fontSize: 12, fontWeight: 600,
              border: '1px solid', borderColor: filter === f.k ? '#0891b2' : '#e2e8f0',
              background: filter === f.k ? '#0891b2' : 'white',
              color: filter === f.k ? 'white' : '#64748b',
              borderRadius: 6, cursor: 'pointer',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Form de création */}
      {showCreate && (
        <div style={{ padding: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {Object.entries(TYPE_META).map(([k, m]) => {
              const disabled = k === 'announcement' && !canAnnounce;
              return (
                <button
                  key={k}
                  onClick={() => setNewThread((p) => ({ ...p, type: k }))}
                  disabled={disabled}
                  title={disabled ? 'Réservé au prof' : m.label}
                  style={{
                    padding: '4px 10px', fontSize: 11, fontWeight: 700,
                    border: '1px solid', borderColor: newThread.type === k ? m.color : '#e2e8f0',
                    background: newThread.type === k ? m.bg : 'white',
                    color: newThread.type === k ? m.color : '#64748b',
                    borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.4 : 1,
                  }}
                >
                  {m.label.toUpperCase()}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            value={newThread.title}
            onChange={(e) => setNewThread((p) => ({ ...p, title: e.target.value }))}
            placeholder="Titre…"
            style={{ width: '100%', padding: 8, fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 6, marginBottom: 8 }}
          />
          <textarea
            value={newThread.content}
            onChange={(e) => setNewThread((p) => ({ ...p, content: e.target.value }))}
            placeholder="Décris ta question, ton annonce ou ton partage…"
            rows={4}
            style={{ width: '100%', padding: 8, fontSize: 12.5, border: '1px solid #e2e8f0', borderRadius: 6, resize: 'vertical', fontFamily: 'inherit' }}
          />
          {err && <div style={{ marginTop: 8, fontSize: 11, color: '#dc2626' }}>{err}</div>}
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button onClick={handleCreate} disabled={creating} className="btn btn-primary btn-sm">
              {creating ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={12} />} Publier
            </button>
            <button onClick={() => { setShowCreate(false); setNewThread({ title: '', content: '', type: 'question' }); }} className="btn btn-ghost btn-sm">
              <X size={12} /> Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {loading && <div style={{ padding: 20, textAlign: 'center', color: '#64748b', fontSize: 13 }}>Chargement…</div>}
      {!loading && threads.length === 0 && (
        <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
          Aucun thread pour l'instant. Sois le premier à poser une question ou partager !
        </div>
      )}
      {!loading && threads.map((t) => (
        <ThreadCard key={t._id} thread={t} projectId={projectId} canPin={canPin} currentUserId={currentUserId} onUpdated={load} />
      ))}
    </section>
  );
}
