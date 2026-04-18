import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

/**
 * Palette par filière. La clé correspond à la valeur stockée dans user.filiere.
 * Contient les valeurs exactes utilisées dans tout le projet (bleu, orange, vert).
 * Fallback ISIL si filière inconnue (même comportement que la version d'avant).
 */
export const FILIERE_THEMES = {
  'ISIL': {
    key: 'ISIL',
    label: 'Informatique',
    primary: '#1B4F72',
    primaryHover: '#164060',
    primaryLight: '#EBF3FA',
    accent: '#2874A6',
    gradient: 'linear-gradient(135deg, #1B4F72 0%, #2874A6 100%)',
  },
  'Management': {
    key: 'Management',
    label: 'Management',
    primary: '#D97706',
    primaryHover: '#B45309',
    primaryLight: '#FEF3C7',
    accent: '#F59E0B',
    gradient: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
  },
  'Finance & Comptabilité': {
    key: 'Finance',
    label: 'Finance & Comptabilité',
    primary: '#059669',
    primaryHover: '#047857',
    primaryLight: '#D1FAE5',
    accent: '#10B981',
    gradient: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
  },
};

export const DEFAULT_THEME = FILIERE_THEMES['ISIL'];

export function getThemeForFiliere(filiere) {
  return FILIERE_THEMES[filiere] || DEFAULT_THEME;
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('fliplearn_theme') || 'light';
  });
  const [filiereTheme, setFiliereTheme] = useState(DEFAULT_THEME);

  // Thème clair/sombre
  useEffect(() => {
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(theme);
    localStorage.setItem('fliplearn_theme', theme);
  }, [theme]);

  // Synchroniser le thème filière depuis l'utilisateur stocké
  useEffect(() => {
    const syncFromUser = () => {
      try {
        const u = JSON.parse(sessionStorage.getItem('fliplearn_user') || 'null');
        const f = u?.filiere;
        const t = getThemeForFiliere(f);
        setFiliereTheme(t);
      } catch { /* ignore */ }
    };
    syncFromUser();
    // Aussi à chaque changement de sessionStorage (login/logout)
    window.addEventListener('storage', syncFromUser);
    // Event custom déclenché manuellement au login/logout
    window.addEventListener('fliplearn:user-changed', syncFromUser);
    return () => {
      window.removeEventListener('storage', syncFromUser);
      window.removeEventListener('fliplearn:user-changed', syncFromUser);
    };
  }, []);

  // Appliquer les CSS custom properties pour toute l'app
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--filiere-primary', filiereTheme.primary);
    root.style.setProperty('--filiere-primary-hover', filiereTheme.primaryHover);
    root.style.setProperty('--filiere-primary-light', filiereTheme.primaryLight);
    root.style.setProperty('--filiere-accent', filiereTheme.accent);
    root.style.setProperty('--filiere-gradient', filiereTheme.gradient);
    document.body.dataset.filiere = filiereTheme.key;
  }, [filiereTheme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, filiereTheme, setFiliereTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
