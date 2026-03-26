import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import { ArrowLeft, ClipboardList, Video, Plus, CheckCircle, ChevronRight } from 'lucide-react';

export default function ProfessorQCMHub() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [videos, setVideos] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/professor/courses');
        setCourses(data);
        // Load videos for each course
        const videoMap = {};
        await Promise.all(
          data.map(async (course) => {
            try {
              const { data: vids } = await api.get(`/videos/course/${course._id}`);
              videoMap[course._id] = vids;
            } catch { videoMap[course._id] = []; }
          })
        );
        setVideos(videoMap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
                        courseVideos.map((video) => (
                          <div key={video._id}
                            onClick={() => navigate(`/professor/videos/${video._id}/qcm`)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
                              cursor: 'pointer', transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                            <Video size={18} color="#1B4F72" />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 500, color: '#1e293b', fontSize: 14 }}>{video.titre}</div>
                            </div>
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                              borderRadius: 6, fontSize: 12, fontWeight: 500,
                              background: '#EBF5FB', color: '#1B4F72'
                            }}>
                              <Plus size={12} /> Créer / Modifier QCM
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
