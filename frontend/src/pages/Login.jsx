import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, ROLE_HOME } from '../context/AuthContext.jsx';
import Logo from '../components/Logo.jsx';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Clock, XCircle } from 'lucide-react';

export default function Login() {
  const [form, setForm]         = useState({ email: '', password: '' });
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState('');
  const [errorKind, setErrorKind] = useState('generic'); // generic | pending | rejected
  const [loading, setLoading]   = useState(false);

  const { login, logout, user: currentUser } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  // Déconnecter l'utilisateur précédent quand on arrive sur /login
  useEffect(() => {
    if (currentUser) {
      logout();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const [serverWaking, setServerWaking] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrorKind('generic');
    setLoading(true);
    // Affiche un message "réveil du serveur" si la requête traîne (Render free tier dort après 15 min)
    const wakeTimer = setTimeout(() => setServerWaking(true), 4000);
    try {
      const user = await login(form.email, form.password);
      const from = location.state?.from?.pathname;
      navigate(from ?? ROLE_HOME[user.role] ?? '/', { replace: true });
    } catch (err) {
      const data = err.response?.data;
      setError(data?.message ?? 'Une erreur est survenue.');
      if (data?.status === 'pending') setErrorKind('pending');
      else if (data?.status === 'rejected') setErrorKind('rejected');
      else setErrorKind('generic');
    } finally {
      clearTimeout(wakeTimer);
      setServerWaking(false);
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg)',
        padding: '16px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '40px 36px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <Logo variant="full" />
        </div>

        {/* Heading */}
        <h1
          style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 700,
            color: 'var(--color-text)',
            marginBottom: 4,
            textAlign: 'center',
          }}
        >
          Connexion
        </h1>
        <p
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            textAlign: 'center',
            marginBottom: 28,
          }}
        >
          Entrez vos identifiants pour accéder à votre espace.
        </p>

        {/* Error — variations visuelles selon statut */}
        {error && errorKind === 'pending' && (
          <div style={{ padding: '14px 16px', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 10, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Clock size={18} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E', marginBottom: 3 }}>Compte en attente de validation</div>
              <div style={{ fontSize: 13, color: '#78350F', lineHeight: 1.5 }}>{error}</div>
            </div>
          </div>
        )}
        {error && errorKind === 'rejected' && (
          <div style={{ padding: '14px 16px', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 10, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <XCircle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#991B1B', marginBottom: 3 }}>Inscription refusée</div>
              <div style={{ fontSize: 13, color: '#7F1D1D', lineHeight: 1.5 }}>{error}</div>
            </div>
          </div>
        )}
        {error && errorKind === 'generic' && (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Email */}
          <div>
            <label className="form-label" htmlFor="email">Adresse email</label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={15}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-disabled)',
                  pointerEvents: 'none',
                }}
              />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                className="form-input"
                style={{ paddingLeft: 36 }}
                placeholder="vous@exemple.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="form-label" htmlFor="password">Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={15}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-disabled)',
                  pointerEvents: 'none',
                }}
              />
              <input
                id="password"
                name="password"
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password"
                className="form-input"
                style={{ paddingLeft: 36, paddingRight: 40 }}
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-disabled)',
                  display: 'flex',
                }}
                tabIndex={-1}
              >
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 4, justifyContent: 'center' }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          {/* Message si le serveur Render free tier sort de veille (>4s) */}
          {serverWaking && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'var(--color-primary-light)',
              border: '1px solid var(--color-primary)',
              fontSize: 12, color: 'var(--color-primary)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Clock size={14} />
              <span>Réveil du serveur en cours… (jusqu'à 60 secondes pour la 1ʳᵉ connexion)</span>
            </div>
          )}
        </form>

        {/* Footer */}
        <p
          style={{
            textAlign: 'center',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            marginTop: 24,
          }}
        >
          Pas encore de compte ?{' '}
          <Link
            to="/register"
            style={{
              color: 'var(--color-primary)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Créer un compte
          </Link>
        </p>
      </div>

      <div style={{
        textAlign: 'center',
        marginTop: 24,
        color: '#94a3b8',
        fontSize: 12,
        lineHeight: 1.6
      }}>
        <div>Projet de Fin d'Études — Licence Informatique ISIL</div>
        <div>Plateforme de Classe Inversée © 2026</div>
      </div>
    </div>
  );
}
