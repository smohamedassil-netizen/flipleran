import { useState } from 'react';
import Layout from '../components/Layout.jsx';
import { Settings as SettingsIcon, Moon, Sun, Bell, Globe, Shield, Info, ChevronRight } from 'lucide-react';

export default function Settings() {
  const [theme, setTheme] = useState('light');
  const [notifications, setNotifications] = useState(true);

  const settingSections = [
    {
      title: 'Apparence',
      icon: Sun,
      items: [
        {
          label: 'Thème',
          description: 'Choisir le thème de l\'interface',
          type: 'select',
          value: theme,
          options: [{ value: 'light', label: 'Clair' }, { value: 'dark', label: 'Sombre (bientôt)' }],
          onChange: (v) => setTheme(v),
        }
      ]
    },
    {
      title: 'Notifications',
      icon: Bell,
      items: [
        {
          label: 'Notifications par email',
          description: 'Recevoir des notifications pour les nouveaux cours et QCM',
          type: 'toggle',
          value: notifications,
          onChange: () => setNotifications(!notifications),
        }
      ]
    },
    {
      title: 'Langue',
      icon: Globe,
      items: [
        {
          label: 'Langue de l\'interface',
          description: 'L\'application est disponible en français',
          type: 'display',
          value: 'Français',
        }
      ]
    },
    {
      title: 'Sécurité',
      icon: Shield,
      items: [
        {
          label: 'Modifier le mot de passe',
          description: 'Changer votre mot de passe de connexion',
          type: 'link',
          to: '/profile',
        }
      ]
    },
    {
      title: 'À propos',
      icon: Info,
      items: [
        {
          label: 'FlipLearn',
          description: 'Plateforme de classe inversée — Projet de Fin d\'Études',
          type: 'display',
          value: 'v1.0.0',
        },
        {
          label: 'Développé par',
          description: 'Licence Informatique — ISIL',
          type: 'display',
          value: '2024-2025',
        }
      ]
    }
  ];

  return (
    <Layout title="Paramètres">
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <SettingsIcon size={24} color="#1B4F72" />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1B4F72', margin: 0 }}>Paramètres</h1>
        </div>

        {settingSections.map((section) => (
          <div key={section.title} style={{
            background: 'white',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            marginBottom: 16,
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid #f3f4f6',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: '#f8fafc'
            }}>
              <section.icon size={18} color="#1B4F72" />
              <span style={{ fontWeight: 600, color: '#1B4F72', fontSize: 14 }}>{section.title}</span>
            </div>

            {section.items.map((item, i) => (
              <div key={i} style={{
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: i < section.items.length - 1 ? '1px solid #f3f4f6' : 'none'
              }}>
                <div>
                  <div style={{ fontWeight: 500, color: '#1e293b', fontSize: 14 }}>{item.label}</div>
                  <div style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>{item.description}</div>
                </div>

                {item.type === 'toggle' && (
                  <button onClick={item.onChange} style={{
                    width: 44, height: 24, borderRadius: 12, border: 'none',
                    background: item.value ? '#1B4F72' : '#d1d5db',
                    cursor: 'pointer', position: 'relative', transition: 'background 0.2s'
                  }}>
                    <span style={{
                      position: 'absolute', top: 2, left: item.value ? 22 : 2,
                      width: 20, height: 20, borderRadius: '50%', background: 'white',
                      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }} />
                  </button>
                )}

                {item.type === 'select' && (
                  <select value={item.value} onChange={(e) => item.onChange(e.target.value)}
                    style={{
                      padding: '6px 12px', borderRadius: 8, border: '1px solid #d1d5db',
                      fontSize: 13, color: '#1e293b', background: 'white'
                    }}>
                    {item.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                )}

                {item.type === 'display' && (
                  <span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>{item.value}</span>
                )}

                {item.type === 'link' && (
                  <a href={item.to} style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    color: '#1B4F72', fontSize: 13, fontWeight: 500, textDecoration: 'none'
                  }}>
                    Modifier <ChevronRight size={14} />
                  </a>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </Layout>
  );
}
