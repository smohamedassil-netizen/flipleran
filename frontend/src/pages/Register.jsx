import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, ROLE_HOME } from '../context/AuthContext.jsx';
import { Brain, User, Mail, Lock, Eye, EyeOff, GraduationCap, BookOpen, AlertCircle, ChevronDown } from 'lucide-react';

const ROLES = [
  { value: 'etudiant',   label: 'Étudiant',    icon: GraduationCap },
  { value: 'professeur', label: 'Professeur',  icon: BookOpen },
];

const FILIERES = [
  'Informatique', 'Mathématiques', 'Physique', 'Chimie',
  'Biologie', 'Génie Civil', 'Génie Électrique', 'Autre',
];

export default function Register() {
  const [step, setStep]       = useState(1); // 1 = compte, 2 = profil
  const [form, setForm]       = useState({
    nom: '', prenom: '', email: '', password: '', confirm: '',
    role: 'etudiant', filiere: '', promotion: '',
  });
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading]   = useState(false);

  const { register } = useAuth();
  const navigate      = useNavigate();

  const set = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  /* ── validation step 1 ─────────────────────────────────────────────────── */
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

  /* ── submit ────────────────────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { confirm, ...payload } = form;
      const user = await register(payload);
      navigate(ROLE_HOME[user.role] ?? '/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message ?? 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  /* ── shared input style helper ─────────────────────────────────────────── */
  const inputIcon = (Icon) => (
    <Icon
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
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg)',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '40px 36px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 28 }}>
          <div
            style={{
              width: 38, height: 38,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Brain size={20} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 'var(--font-size-xl)', color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>
            FlipLearn
          </span>
        </div>

        {/* Heading */}
        <h1 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-text)', textAlign: 'center', marginBottom: 4 }}>
          Créer un compte
        </h1>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', textAlign: 'center', marginBottom: 24 }}>
          Étape {step} sur 2 — {step === 1 ? 'Vos identifiants' : 'Votre profil'}
        </p>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {[1, 2].map((s) => (
            <div
              key={s}
              style={{
                flex: 1, height: 3, borderRadius: 2,
                backgroundColor: s <= step ? 'var(--color-primary)' : 'var(--color-border)',
                transition: 'background-color 200ms',
              }}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={step === 1 ? (e) => { e.preventDefault(); if (validateStep1()) setStep(2); } : handleSubmit}>
          {/* ── STEP 1 ──────────────────────────────────────────────────── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Nom / Prenom row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label" htmlFor="nom">Nom</label>
                  <div style={{ position: 'relative' }}>
                    {inputIcon(User)}
                    <input
                      id="nom" name="nom" className="form-input"
                      style={{ paddingLeft: 36 }} placeholder="Dupont"
                      value={form.nom} onChange={(e) => set('nom', e.target.value)}
                    />
                  </div>
                  {fieldErrors.nom && <p className="form-error">{fieldErrors.nom}</p>}
                </div>
                <div>
                  <label className="form-label" htmlFor="prenom">Prénom</label>
                  <div style={{ position: 'relative' }}>
                    {inputIcon(User)}
                    <input
                      id="prenom" name="prenom" className="form-input"
                      style={{ paddingLeft: 36 }} placeholder="Marie"
                      value={form.prenom} onChange={(e) => set('prenom', e.target.value)}
                    />
                  </div>
                  {fieldErrors.prenom && <p className="form-error">{fieldErrors.prenom}</p>}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="form-label" htmlFor="email">Adresse email</label>
                <div style={{ position: 'relative' }}>
                  {inputIcon(Mail)}
                  <input
                    id="email" name="email" type="email" autoComplete="email"
                    className="form-input" style={{ paddingLeft: 36 }}
                    placeholder="vous@exemple.com"
                    value={form.email} onChange={(e) => set('email', e.target.value)}
                  />
                </div>
                {fieldErrors.email && <p className="form-error">{fieldErrors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="form-label" htmlFor="password">Mot de passe</label>
                <div style={{ position: 'relative' }}>
                  {inputIcon(Lock)}
                  <input
                    id="password" name="password"
                    type={showPwd ? 'text' : 'password'}
                    className="form-input" style={{ paddingLeft: 36, paddingRight: 40 }}
                    placeholder="Minimum 6 caractères"
                    value={form.password} onChange={(e) => set('password', e.target.value)}
                  />
                  <button
                    type="button" onClick={() => setShowPwd((v) => !v)} tabIndex={-1}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-disabled)', display: 'flex' }}
                  >
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {fieldErrors.password && <p className="form-error">{fieldErrors.password}</p>}
              </div>

              {/* Confirm */}
              <div>
                <label className="form-label" htmlFor="confirm">Confirmer le mot de passe</label>
                <div style={{ position: 'relative' }}>
                  {inputIcon(Lock)}
                  <input
                    id="confirm" name="confirm"
                    type={showPwd ? 'text' : 'password'}
                    className="form-input" style={{ paddingLeft: 36 }}
                    placeholder="••••••••"
                    value={form.confirm} onChange={(e) => set('confirm', e.target.value)}
                  />
                </div>
                {fieldErrors.confirm && <p className="form-error">{fieldErrors.confirm}</p>}
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 4, justifyContent: 'center' }}>
                Continuer
              </button>
            </div>
          )}

          {/* ── STEP 2 ──────────────────────────────────────────────────── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Role selector */}
              <div>
                <label className="form-label">Je suis</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {ROLES.map(({ value, label, icon: Icon }) => {
                    const active = form.role === value;
                    return (
                      <button
                        key={value} type="button"
                        onClick={() => set('role', value)}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          gap: 8, padding: '16px 12px',
                          border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          borderRadius: 'var(--radius-lg)',
                          backgroundColor: active ? 'var(--color-primary-light)' : 'var(--color-surface)',
                          cursor: 'pointer',
                          transition: 'border-color 150ms, background-color 150ms',
                        }}
                      >
                        <Icon size={20} color={active ? 'var(--color-primary)' : 'var(--color-text-secondary)'} />
                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: active ? 'var(--color-primary)' : 'var(--color-text)' }}>
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filiere */}
              <div>
                <label className="form-label" htmlFor="filiere">Filière</label>
                <div style={{ position: 'relative' }}>
                  <select
                    id="filiere" name="filiere"
                    className="form-input"
                    style={{ paddingRight: 36, appearance: 'none', cursor: 'pointer' }}
                    value={form.filiere}
                    onChange={(e) => set('filiere', e.target.value)}
                  >
                    <option value="">Sélectionner une filière</option>
                    {FILIERES.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <ChevronDown
                    size={15}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-secondary)' }}
                  />
                </div>
              </div>

              {/* Promotion */}
              <div>
                <label className="form-label" htmlFor="promotion">Promotion / Année</label>
                <input
                  id="promotion" name="promotion"
                  className="form-input"
                  placeholder="Ex: L3 2024-2025"
                  value={form.promotion}
                  onChange={(e) => set('promotion', e.target.value)}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn btn-secondary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Retour
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {loading ? 'Inscription...' : "S'inscrire"}
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 24 }}>
          Déjà un compte ?{' '}
          <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
