import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import { ArrowLeft, ClipboardList, Video, Plus, CheckCircle, ChevronRight, Edit, Trash2, AlertCircle } from 'lucide-react';

export default function ProfessorQCMHub() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [videos, setVideos] = useState({});
  const [qcmData, setQcmData] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { videoId, qcmId }

  const fetchQCMForVideo = async (videoId) => {
    try {
      const { data } = await api.get(`/qcm/video/${videoId}`);
      return data;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/professor/courses');
        setCourses(data);
        // Load videos for each course
        const videoMap = {};
        const allVideos = [];
        await Promise.all(
          data.map(async (course) => {
            try {
              const { data: vids } = await api.get(`/videos/course/${course._id}`);
              videoMap[course._id] = vids;
              allVideos.push(...vids);
            } catch { videoMap[course._id] = []; }
          })
        );
        setVideos(videoMap);

        // Fetch QCM data for all videos
        const qcmMap = {};
        await Promise.all(
          allVideos.map(async (video) => {
            const qcm = await fetchQCMForVideo(video._id);
            if (qcm) qcmMap[video._id] = qcm;
          })
        );
        setQcmData(qcmMap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDelete = async (qcmId, videoId) => {
    try {
      await api.delete(`/qcm/${qcmId}`);
      setQcmData(prev => {
        const updated = { ...prev };
        delete updated[videoId];
        return updated;
      });
      setConfirmDelete(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la suppression');
      setConfirmDelete(null);
    }
  };

  return (
    <Layout title="Gérer les QCM">
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#1B4F72', cursor: 'pointer', fontSize: 15, fontWeight: 500, padding: '8px 0', marginBottom: 12 }}>
          <ArrowLeft size={18} /> Retour
        </button>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1B4F72', marginBottom: 4 }}>Gérer les QCM</h1>
        <p style={{ color: '#64748b', marginBottom: 24 }}>Créez et modifiez les questionnaires associés à vos vidéos</p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Chargement...</div>
        ) : courses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, background: 'white', borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <ClipboardList size={48} color="#d1d5db" />
            <p style={{ color: '#64748b', marginTop: 12 }}>Aucun cours trouvé. Créez d'abord un cours.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {courses.map((course) => {
              const courseVideos = videos[course._id] || [];
              const isExpanded = expandedCourse === course._id;

              return (
                <div key={course._id} style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                  <button
                    onClick={() => setExpandedCourse(isExpanded ? null : course._id)}
                    style={{
                      width: '100%', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left'
                    }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 15 }}>{course.titre}</div>
                      <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 2 }}>{courseVideos.length} vidéo(s)</div>
                    </div>
                    <ChevronRight size={18} color="#94a3b8" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>

                  {isExpanded && (
                    <div style={{ borderTop: '1px solid #f3f4f6', padding: '8px 0' }}>
                      {courseVideos.length === 0 ? (
                        <div style={{ padding: '16px 20px', color: '#94a3b8', fontSize: 13 }}>
                          Aucune vidéo. Uploadez d'abord une vidéo pour créer un QCM.
                        </div>
                      ) : (
                        courseVideos.map((video) => {
                          const qcm = qcmData[video._id];
                          const hasQCM = !!qcm;
                          const questionCount = qcm?.questions?.length || 0;

                          return (
                            <div key={video._id} style={{
                              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                              <Video size={18} color="#1B4F72" />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500, color: '#1e293b', fontSize: 14 }}>{video.titre}</div>
                                {/* QCM status badge */}
                                <div style={{ marginTop: 4 }}>
                                  {hasQCM ? (
                                    <span style={{
                                      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px',
                                      borderRadius: 6, fontSize: 12, fontWeight: 600,
                                      background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0',
                                    }}>
                                      <CheckCircle size={12} /> QCM créé &bull; {questionCount} question{questionCount > 1 ? 's' : ''}
                                    </span>
                                  ) : (
                                    <span style={{
                                      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px',
                                      borderRadius: 6, fontSize: 12, fontWeight: 600,
                                      background: '#FFF7ED', color: '#EA580C', border: '1px solid #FED7AA',
                                    }}>
                                      <AlertCircle size={12} /> Pas de QCM
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 6 }}>
                                {hasQCM ? (
                                  <>
                                    <button
                                      onClick={() => navigate(`/professor/videos/${video._id}/qcm`)}
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
                                        borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                        background: '#EBF5FB', color: '#1B4F72', border: '1px solid #BFDBFE',
                                      }}>
                                      <Edit size={13} /> Modifier
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setConfirmDelete({ videoId: video._id, qcmId: qcm._id }); }}
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
                                        borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                        background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
                                      }}>
                                      <Trash2 size={13} /> Supprimer
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => navigate(`/professor/videos/${video._id}/qcm`)}
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
                                      borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                      background: '#EBF5FB', color: '#1B4F72', border: '1px solid #BFDBFE',
                                    }}>
                                    <Plus size={13} /> Créer
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Confirm Delete Dialog ─────────────────────────────────────────── */}
        {confirmDelete && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 400, textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Trash2 size={24} color="#DC2626" />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Supprimer ce QCM ?</h3>
              <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>Cette action est irréversible. Toutes les questions et résultats associés seront supprimés.</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={() => setConfirmDelete(null)} style={{
                  padding: '10px 24px', borderRadius: 8, border: '1px solid #d1d5db',
                  background: 'white', color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                }}>
                  Annuler
                </button>
                <button onClick={() => handleDelete(confirmDelete.qcmId, confirmDelete.videoId)} style={{
                  padding: '10px 24px', borderRadius: 8, border: 'none',
                  background: '#DC2626', color: 'white', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                }}>
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
