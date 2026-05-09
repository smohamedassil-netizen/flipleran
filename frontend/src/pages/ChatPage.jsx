import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { MessageSquare, BookOpen, User, ArrowLeft } from 'lucide-react';
import Layout  from '../components/Layout.jsx';
import ChatBox from '../components/ChatBox.jsx';
import api     from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';

/* ─── Construit le roomId selon le type de salle ─────────────────────────── */
function buildRoomId(type, { courseId, userId, myId }) {
  if (type === 'course')  return `course_${courseId}`;
  if (type === 'private') return `private_${[myId, userId].sort().join('_')}`;
  return null;
}

/* ─── ChatPage ───────────────────────────────────────────────────────────── */
export default function ChatPage({ roomType = 'course' }) {
  const { courseId, userId } = useParams();
  const location             = useLocation();
  const navigate             = useNavigate();
  const { user }             = useAuth();

  const [roomLabel, setRoomLabel] = useState('Chat');
  const [loading,   setLoading]   = useState(true);

  const myId   = user?._id?.toString();
  const roomId = buildRoomId(roomType, { courseId, userId, myId });

  /* ── Charger le label de la salle ─────────────────────────────────── */
  useEffect(() => {
    if (!roomId) return;
    setLoading(false);

    if (roomType === 'course' && courseId) {
      // Essayer de charger le nom du cours
      api.get(`/courses/${courseId}`)
        .then(({ data }) => setRoomLabel(`Chat — ${data.titre ?? 'Cours'}`))
        .catch(() => setRoomLabel('Chat du module'));
      return;
    }

    if (roomType === 'private') {
      // Le nom du contact peut être passé via location.state
      const contactName = location.state?.contactName;
      if (contactName) {
        setRoomLabel(`Message privé — ${contactName}`);
      } else if (userId) {
        // Fallback : charger depuis l'API
        api.get(`/auth/user/${userId}`)
          .then(({ data }) => setRoomLabel(`Message privé — ${data.prenom} ${data.nom}`))
          .catch(() => setRoomLabel('Message privé'));
      } else {
        setRoomLabel('Message privé');
      }
      return;
    }
  }, [roomId, roomType, courseId, userId, location.state]);

  /* ── Icône selon le type ──────────────────────────────────────────── */
  const Icon = roomType === 'course'  ? BookOpen
             : roomType === 'private' ? User
             : MessageSquare;

  /* ── Titre de la page ─────────────────────────────────────────────── */
  const pageTitle = roomType === 'course'  ? 'Chat du module'
                  : roomType === 'private' ? 'Message privé'
                  : 'Chat';

  if (!roomId || !myId) {
    return (
      <Layout title={pageTitle}>
        <div className="empty-state">Chargement…</div>
      </Layout>
    );
  }

  return (
    <Layout title={pageTitle}>
      <button onClick={() => navigate('/chat')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#1B4F72', cursor: 'pointer', fontSize: 15, fontWeight: 500, padding: '8px 0', marginBottom: 12 }}>
        <ArrowLeft size={18} /> Retour
      </button>
      {/* ── En-tête de section ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Icon size={18} color="var(--primary)" />
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{roomLabel}</h1>

        {roomType === 'course' && (
          <a
            href={`/courses/${courseId}`}
            style={{
              marginLeft: 'auto',
              fontSize:   '12px',
              color:      'var(--primary)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            ← Retour au module
          </a>
        )}
      </div>

      <ChatBox
        roomId={roomId}
        roomLabel={roomLabel}
        roomType={roomType}
        receiverId={roomType === 'private' ? userId : undefined}
        height="calc(100vh - 180px)"
      />
    </Layout>
  );
}
