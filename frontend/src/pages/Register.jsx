import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../utils/api.js';
import Logo from '../components/Logo.jsx';
import {
  User, Mail, Lock, Eye, EyeOff, GraduationCap, BookOpen, AlertCircle,
  ChevronDown, Clock, CheckCircle, ShieldCheck, Mail as MailIcon, ArrowRight,
  XCircle, RefreshCw,
} from 'lucide-react';

const ROLES = [
  { value: 'etudiant',   label: 'Étudiant',    icon: GraduationCap },
  { value: 'professeur', label: 'Professeur',  icon: BookOpen },
];

const FILIERES = [
  { value: 'ISIL',                     label: 'ISIL (Informatique)',          color: '#1B4F72' },
  { value: 'Management',               label: 'Management',                   color: '#D97706' },
  { value: 'Finance & Comptabilité',   label: 'Finance & Comptabilité',       color: '#059669' },
];

const PROMOTIONS = ['L1', 'L2', 'L3'];

export default function Register() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', password: '', confirm: '',
    role: 'etudiant', filiere: '', promotion: '',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverWaking, setServerWaking] = useState(false);
  const [submitted, setSubmitted] = useState(null); // { email } après succès
  const [statusCheck, setStatusCheck] = useState(null); // { exists, status } après vérif

  const { register } = useAuth();
  const navigate = useNavigate();

  const set = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateStep1 = () => {
    const errs = {};
    if (!form.nom.trim())    errs.nom    = 'Nom requis.';
    if (!form.prenom.trim()) errs.prenom = 'Prénom requis.';
    if (!form.email.includes('@')) errs.email = 'Email invalide.';
    if (form.password.length < 6)  errs.password = 'Minimum 6 caractères.';
    if (form.password !== form.confirm) errs.confirm = 'Les mots de passe ne correspondent pas.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs = {};
    if (!form.filiere)   errs.filiere   = 'Sélectionne une spécialité.';
    if (!form.promotion) errs.promotion = 'Sélectionne ton niveau.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateStep2()) return;
    setLoading(true);
    // Affiche un message "réveil du serveur" si la requête traîne (Render free tier dort après 15 min)
    const wakeTimer = setTimeout(() => setServerWaking(true), 4000);
    try {
      const { confirm, ...payload } = form;
      const data = await register(payload);
      setSubmitted({ email: data.email || form.email, message: data.message });
    } catch (err) {
      // Cas timeout / serveur injoignable → message dédié
      if (err.code === 'ECONNABORTED' || !err.response) {
        setError("Le serveur met du temps à répondre. Réessaye dans quelques secondes (le serveur peut être en cours de réveil).");
      } else {
        setError(err.response?.data?.message ?? 'Une erreur est survenue.');
      }
    } finally {
      clearTimeout(wakeTimer);
      setServerWaking(false);
      setLoading(false);
    }
  };

  // Vérifie le statut d'un compte (utilisé sur l'écran de confirmation)
  const refreshStatus = async () => {
    if (!submitted?.email) return;
    setStatusCheck({ loading: true });
    try {
      const { data } = await api.get('/auth/status', { params: { email: submitted.email } });
      setStatusCheck(data); // { exists, status }
    } catch {
      setStatusCheck({ error: true });
    }
  };

  const inputIcon = (Icon) => (
    <Icon size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-disabled)', pointerEvents: 'none' }} />
  );

  /* ─── Écran de confirmation post-inscription ─────────────────────────── */
  if (submitted) {
    // Détermine la couleur/icône selon le statut renvoyé par checkStatus
    const isActive   = statusCheck?.status === 'active';
    const isRejected = statusCheck?.status === 'rejected';
    const headerColor = isActive ? '#059669' : isRejected ? '#DC2626' : '#D97706';
    const headerBg = isActive
      ? 'linear-gradient(135deg, #D1FAE5, #A7F3D0)'
      : isRejected
        ? 'linear-gradient(135deg, #FEE2E2, #FCA5A5)'
        : 'linear-gradient(135deg, #FEF3C7, #FDE68A)';
    const HeaderIcon = isActive ? CheckCircle : isRejected ? XCircle : Clock;
    const headerTitle = isActive
      ? '🎉 Compte activé !'
      : isRejected
        ? 'Inscription refusée'
        : 'Compte en attente de validation';

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)', padding: 16 }}>
        <div style={{ width: '100%', maxWidth: 480, background: 'white', borderRadius: 20, padding: '40px 36px', boxShadow: '0 20px 50px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 80, height: 80, borderRadius: '50%', background: headerBg, marginBottom: 18, animation: 'result-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
            <HeaderIcon size={40} color={headerColor} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1B4F72', margin: 0, marginBottom: 8 }}>
            {headerTitle}
          </h1>
          <p style={{ color: '#64748B', margin: 0, marginBottom: 20, lineHeight: 1.5 }}>
            {isActive
              ? `Ton compte FlipLearn est maintenant activé. Tu peux te connecter.`
              : isRejected
                ? "Ton inscription a été refusée par un administrateur. Le motif détaillé t'a été envoyé par email."
                : (submitted.message || "Ton inscription a bien été enregistrée. Un administrateur va vérifier ton compte avant que tu puisses te connecter.")}
          </p>

          {!isActive && !isRejected && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, padding: 14, background: '#F8FAFC', borderRadius: 12, textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#475569' }}>
                <MailIcon size={14} color="#1B4F72" />
                <span>Email enregistré : <strong>{submitted.email}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#475569' }}>
                <ShieldCheck size={14} color="#059669" />
                <span>Un admin FlipLearn vérifie ta spécialité et ton niveau.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#475569' }}>
                <Clock size={14} color="#D97706" />
                <span>Délai habituel : <strong>moins de 24h</strong>.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#475569' }}>
                <CheckCircle size={14} color="#D97706" />
                <span>Tu recevras un email dès que ton compte sera activé.</span>
              </div>
            </div>
          )}

          {/* Bouton de vérification du statut (n'apparaît pas si déjà actif) */}
          {!isActive && (
            <button
              type="button"
              onClick={refreshStatus}
              disabled={statusCheck?.loading}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '10px 18px',
                background: 'white',
                border: '1px solid #CBD5E1',
                color: '#1B4F72',
                borderRadius: 10,
                fontWeight: 600, fontSize: 13,
                cursor: statusCheck?.loading ? 'wait' : 'pointer',
                marginBottom: 12,
                fontFamily: 'inherit',
              }}
            >
              <RefreshCw size={13} style={statusCheck?.loading ? { animation: 'spin 1s linear infinite' } : {}} />
              {statusCheck?.loading ? 'Vérification…' : 'Vérifier le statut de mon compte'}
            </button>
          )}

          {statusCheck?.error && (
            <p style={{ color: '#DC2626', fontSize: 12, marginBottom: 12 }}>
              Impossible de vérifier le statut. Réessaye plus tard.
            </p>
          )}

          <div>
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 24px', background: 'linear-gradient(135deg, #1B4F72, #2874A6)', color: 'white', textDecoration: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, boxShadow: '0 4px 14px rgba(27,79,114,.3)' }}>
              {isActive ? 'Me connecter' : 'Retour à la connexion'} <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Formulaire ──────────────────────────────────────────────────── */
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-bg)', padding: '16px', overflow: 'hidden' }}>
      <div style={{ width: '100%', maxWidth: 460, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '40px 36px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <Logo variant="full" />
        </div>

        <h1 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-text)', textAlign: 'center', marginBottom: 4 }}>
          Créer un compte
        </h1>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', textAlign: 'center', marginBottom: 24 }}>
          Étape {step} sur 2 — {step === 1 ? 'Vos identifiants' : 'Votre profil'}
        </p>

        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {[1, 2].map((s) => (
            <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: s <= step ? 'var(--color-primary)' : 'var(--color-border)', transition: 'background-color 200ms' }} />
          ))}
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={step === 1 ? (e) => { e.preventDefault(); if (validateStep1()) setStep(2); } : handleSubmit}>
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label" htmlFor="nom">Nom</label>
                  <div style={{ position: 'relative' }}>
                    {inputIcon(User)}
                    <input id="nom" name="nom" className="form-input" style={{ paddingLeft: 36 }} placeholder="Dupont" value={form.nom} onChange={(e) => set('nom', e.target.value)} />
                  </div>
                  {fieldErrors.nom && <p className="form-error">{fieldErrors.nom}</p>}
                </div>
                <div>
                  <label className="form-label" htmlFor="prenom">Prénom</label>
                  <div style={{ position: 'relative' }}>
                    {inputIcon(User)}
                    <input id="prenom" name="prenom" className="form-input" style={{ paddingLeft: 36 }} placeholder="Marie" value={form.prenom} onChange={(e) => set('prenom', e.target.value)} />
                  </div>
                  {fieldErrors.prenom && <p className="form-error">{fieldErrors.prenom}</p>}
                </div>
              </div>

              <div>
                <label className="form-label" htmlFor="email">Adresse email</label>
                <div style={{ position: 'relative' }}>
                  {inputIcon(Mail)}
                  <input id="email" name="email" type="email" autoComplete="email" className="form-input" style={{ paddingLeft: 36 }} placeholder="vous@exemple.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
                </div>
                {fieldErrors.email && <p className="form-error">{fieldErrors.email}</p>}
              </div>

              <div>
                <label className="form-label" htmlFor="password">Mot de passe</label>
                <div style={{ position: 'relative' }}>
                  {inputIcon(Lock)}
                  <input id="password" name="password" type={showPwd ? 'text' : 'password'} className="form-input" style={{ paddingLeft: 36, paddingRight: 40 }} placeholder="Minimum 6 caractères" value={form.password} onChange={(e) => set('password', e.target.value)} />
                  <button type="button" onClick={() => setShowPwd((v) => !v)} tabIndex={-1} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-disabled)', display: 'flex' }}>
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {fieldErrors.password && <p className="form-error">{fieldErrors.password}</p>}
              </div>

              <div>
                <label className="form-label" htmlFor="confirm">Confirmer le mot de passe</label>
                <div style={{ position: 'relative' }}>
                  {inputIcon(Lock)}
                  <input id="confirm" name="confirm" type={showPwd ? 'text' : 'password'} className="form-input" style={{ paddingLeft: 36 }} placeholder="••••••••" value={form.confirm} onChange={(e) => set('confirm', e.target.value)} />
                </div>
                {fieldErrors.confirm && <p className="form-error">{fieldErrors.confirm}</p>}
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 4, justifyContent: 'center' }}>
                Continuer
              </button>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label">Je suis</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {ROLES.map(({ value, label, icon: Icon }) => {
                    const active = form.role === value;
                    return (
                      <button key={value} type="button" onClick={() => set('role', value)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 12px', border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-lg)', backgroundColor: active ? 'var(--color-primary-light)' : 'var(--color-surface)', cursor: 'pointer', transition: 'border-color 150ms, background-color 150ms' }}>
                        <Icon size={20} color={active ? 'var(--color-primary)' : 'var(--color-text-secondary)'} />
                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: active ? 'var(--color-primary)' : 'var(--color-text)' }}>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="form-label">Spécialité</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                  {FILIERES.map((f) => {
                    const active = form.filiere === f.value;
                    return (
                      <button key={f.value} type="button" onClick={() => set('filiere', f.value)} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '12px 14px',
                        border: `2px solid ${active ? f.color : '#E5E7EB'}`,
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: active ? `${f.color}12` : 'white',
                        cursor: 'pointer', transition: 'all 150ms', textAlign: 'left',
                      }}>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', background: active ? f.color : '#E5E7EB', flexShrink: 0 }} />
                        <span style={{ fontSize: 14, fontWeight: active ? 700 : 500, color: active ? f.color : '#475569', fontFamily: 'inherit' }}>
                          {f.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {fieldErrors.filiere && <p className="form-error">{fieldErrors.filiere}</p>}
              </div>

              <div>
                <label className="form-label">Niveau</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {PROMOTIONS.map((p) => {
                    const active = form.promotion === p;
                    return (
                      <button key={p} type="button" onClick={() => set('promotion', p)} style={{
                        padding: '10px',
                        border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: active ? 'var(--color-primary-light)' : 'var(--color-surface)',
                        color: active ? 'var(--color-primary)' : 'var(--color-text)',
                        fontWeight: active ? 700 : 500, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                        {p}
                      </button>
                    );
                  })}
                </div>
                {fieldErrors.promotion && <p className="form-error">{fieldErrors.promotion}</p>}
              </div>

              <div style={{ padding: 12, background: '#FEF3C7', borderRadius: 8, fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
                <strong>ℹ️ Validation requise :</strong> ton compte sera vérifié par un administrateur avant d'être activé. Tu recevras un email dès qu'il pourra être utilisé.
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setStep(1)} className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                  Retour
                </button>
                <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  {loading ? 'Inscription...' : "S'inscrire"}
                </button>
              </div>

              {/* Bandeau de réveil du serveur (Render free tier dort après 15 min d'inactivité) */}
              {serverWaking && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: 'var(--color-primary-light)',
                  border: '1px solid var(--color-primary)',
                  fontSize: 12, color: 'var(--color-primary)',
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginTop: 4,
                }}>
                  <Clock size={14} />
                  <span>Réveil du serveur en cours… (jusqu'à 60 secondes pour la 1ʳᵉ inscription)</span>
                </div>
              )}
            </div>
          )}
        </form>

        <p style={{ textAlign: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 24 }}>
          Déjà un compte ?{' '}
          <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
            Se connecter
          </Link>
        </p>
      </div>

      <div style={{ textAlign: 'center', marginTop: 24, color: '#94a3b8', fontSize: 12, lineHeight: 1.6 }}>
        <div>Projet de Fin d'Études — Licence ISIL</div>
        <div>Plateforme de Classe Inversée © 2026</div>
      </div>
    </div>
  );
}
