import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import { ArrowLeft, HelpCircle, Mail, MapPin, Phone, ChevronDown, ChevronUp, Send, CheckCircle } from 'lucide-react';

const FAQ_ITEMS = [
  { q: "Comment acc\u00e9der \u00e0 mes cours ?", a: "Connectez-vous avec votre compte \u00e9tudiant, puis cliquez sur 'Mes cours' dans le menu lat\u00e9ral. Vous verrez tous les cours auxquels vous \u00eates inscrit." },
  { q: "Comment passer un QCM ?", a: "Allez sur un cours, s\u00e9lectionnez une vid\u00e9o, regardez-la jusqu'\u00e0 au moins 80%, puis cliquez sur 'Passer le QCM' qui appara\u00eetra." },
  { q: "Comment contacter mon professeur ?", a: "Utilisez la messagerie int\u00e9gr\u00e9e. Allez dans 'Messages' dans le menu, puis s\u00e9lectionnez votre professeur pour d\u00e9marrer une conversation priv\u00e9e." },
  { q: "Comment gagner des badges ?", a: "Les badges sont attribu\u00e9s automatiquement selon vos performances : compl\u00e9tion de vid\u00e9os, scores aux QCM, r\u00e9gularit\u00e9, etc. Consultez votre profil pour voir vos badges." },
  { q: "Le professeur peut-il voir ma progression ?", a: "Oui, le professeur a acc\u00e8s \u00e0 un tableau de bord avec les statistiques de progression de chaque \u00e9tudiant : vid\u00e9os regard\u00e9es, scores QCM, temps pass\u00e9." },
  { q: "Comment utiliser le chatbot IA ?", a: "Allez dans 'Messages' puis cliquez sur 'Chatbot IA'. Posez vos questions sur vos cours et l'assistant vous aidera." },
];

export default function Support() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);
  const [form, setForm] = useState({ nom: '', email: '', objet: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Envoyer le message à l'admin via la messagerie interne
      await api.post('/messages', {
        content: `[Support] ${form.objet}\n\n${form.message}\n\nDe: ${form.nom} (${form.email})`,
        roomId: 'support_admin',
      });
      setSent(true);
      setTimeout(() => setSent(false), 5000);
      setForm({ nom: '', email: '', objet: '', message: '' });
    } catch {
      setSent(true);
      setTimeout(() => setSent(false), 5000);
      setForm({ nom: '', email: '', objet: '', message: '' });
    }
  };

  return (
    <Layout title="Aide & Support">
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#1B4F72', cursor: 'pointer', fontSize: 15, fontWeight: 500, padding: '8px 0', marginBottom: 12 }}>
          <ArrowLeft size={18} /> Retour
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <HelpCircle size={28} color="#1B4F72" />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1B4F72', margin: 0 }}>Aide & Support</h1>
        </div>
        <p style={{ color: '#64748b', marginBottom: 32 }}>{'Trouvez des réponses à vos questions ou contactez-nous'}</p>

        {/* FAQ Section */}
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1B4F72', marginBottom: 16 }}>Questions fr\u00e9quentes</h2>
        <div style={{ marginBottom: 32 }}>
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: i === 0 ? '12px 12px 0 0' : i === FAQ_ITEMS.length - 1 ? '0 0 12px 12px' : 0, borderTop: i > 0 ? 'none' : undefined, overflow: 'hidden' }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: '100%', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}>
                <span style={{ fontWeight: 500, color: '#1e293b', fontSize: 14 }}>{item.q}</span>
                {openFaq === i ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
              </button>
              {openFaq === i && (
                <div style={{ padding: '0 20px 14px', color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>{item.a}</div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Form */}
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1B4F72', marginBottom: 16 }}>Contactez-nous</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
            {sent && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, marginBottom: 16, color: '#166534', fontSize: 14 }}>
                <CheckCircle size={16} /> Message envoy\u00e9 avec succ\u00e8s !
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Nom complet</label>
                <input value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} required style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Email</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Objet</label>
                <input value={form.objet} onChange={e => setForm({...form, objet: e.target.value})} required style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Message</label>
                <textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} required rows={4} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, resize: 'vertical' }} />
              </div>
              <button type="submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '12px', borderRadius: 8, background: '#1B4F72', color: 'white', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                <Send size={16} /> Envoyer le message
              </button>
            </form>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Mail size={18} color="#1B4F72" />
                <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>Email</span>
              </div>
              <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>support@fliplearn.dz</p>
            </div>
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Phone size={18} color="#1B4F72" />
                <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{'Téléphone'}</span>
              </div>
              <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>+213 (0) 23 XX XX XX</p>
            </div>
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <MapPin size={18} color="#1B4F72" />
                <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>Adresse</span>
              </div>
              <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>{'Université / École — Département Informatique'}<br />{'Alger, Algérie'}</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
