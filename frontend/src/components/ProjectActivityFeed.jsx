import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { Activity, CheckCircle, Upload, Star, Users as UsersIcon, Edit3, Clock } from 'lucide-react';

const TYPE_META = {
  phase_status:      { icon: CheckCircle, color: '#059669', bg: '#d1fae5' },
  livrable_added:    { icon: Upload,      color: '#7c3aed', bg: '#ede9fe' },
  livrable_removed:  { icon: Upload,      color: '#dc2626', bg: '#fee2e2' },
  evaluation_added:  { icon: Star,        color: '#d97706', bg: '#fef3c7' },
  status_change:     { icon: Edit3,       color: '#1B4F72', bg: '#dbeafe' },
  groupes_updated:   { icon: UsersIcon,   color: '#0284c7', bg: '#e0f2fe' },
  note:              { icon: Activity,    color: '#64748b', bg: '#f1f5f9' },
};

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `il y a ${days} j`;
  return new Date(iso).toLocaleDateString('fr-FR');
}

/**
 * Affiche la timeline d'activité du projet + écoute les mises à jour temps réel via Socket.io.
 * L'historique initial vient de project.activity (déjà chargé par ProjectDetail).
 */
export default function ProjectActivityFeed({ projectId, initialActivity = [] }) {
  const [entries, setEntries] = useState(() => [...initialActivity].reverse());
  const socketRef = useRef(null);

  useEffect(() => {
    setEntries([...initialActivity].reverse());
  }, [initialActivity]);

  useEffect(() => {
    let user;
    try {
      user = JSON.parse(sessionStorage.getItem('fliplearn_user') || 'null');
    } catch { user = null; }
    if (!user?.token || !projectId) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');
    const socket = io(socketUrl, {
      auth: { token: user.token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join', `project_${projectId}`);
    });

    socket.on('project:activity', (event) => {
      if (event.projectId && event.projectId !== projectId) return;
      setEntries(prev => [{
        _id: `rt_${Date.now()}`,
        type: event.type,
        description: event.description,
        at: event.at,
        meta: event.meta,
        authorId: { _id: event.by },
      }, ...prev].slice(0, 50));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [projectId]);

  if (!entries.length) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={16} color="#1B4F72" /> Activité du projet
        </h3>
        <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
          Aucune activité pour le moment. Les changements de phase, les dépôts de livrables et les évaluations apparaîtront ici en temps réel.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Activity size={16} color="#1B4F72" /> Activité du projet
        <span style={{ fontSize: 11, padding: '2px 8px', background: '#f0fdf4', color: '#059669', borderRadius: 999, fontWeight: 600 }}>
          ● En direct
        </span>
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 400, overflowY: 'auto' }}>
        {entries.map((entry, idx) => {
          const meta = TYPE_META[entry.type] || TYPE_META.note;
          const Icon = meta.icon;
          const author = entry.authorId?.prenom
            ? `${entry.authorId.prenom} ${entry.authorId.nom || ''}`.trim()
            : 'Quelqu\'un';
          return (
            <div key={entry._id || idx} style={{ display: 'flex', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={14} color={meta.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.4 }}>
                  <strong>{author}</strong> — {entry.description}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={10} /> {timeAgo(entry.at)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
