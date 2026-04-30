/**
 * Markdown — Rendu Markdown léger sans dépendance externe.
 *
 * Couvre le sous-ensemble suffisant pour le contrat pédagogique :
 * titres (#, ##, ###), gras (**), italique (*), code inline (`),
 * listes à puces (-, *), liens [txt](url), paragraphes, sauts de ligne.
 *
 * NB : pas de support des tableaux, blocs de code multi-ligne, images, ni
 * HTML brut. Volontairement minimal pour rester sûr (échappement systématique
 * du HTML d'entrée) et léger (pas de lib).
 */

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInline(line) {
  let out = escapeHtml(line);
  // Code inline `…`
  out = out.replace(/`([^`]+)`/g, '<code style="background:#F1F5F9;padding:1px 6px;border-radius:4px;font-size:0.9em;font-family:monospace">$1</code>');
  // Gras **…**
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italique *…* (avec lookbehind/forward simulé : pas suivi de **)
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  // Liens [txt](url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, txt, url) => {
    if (!/^https?:\/\//i.test(url)) return m;
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#1B4F72;text-decoration:underline">${txt}</a>`;
  });
  return out;
}

function toHtml(src) {
  if (!src) return '';
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let listOpen = false;
  let paraBuf = [];

  const flushPara = () => {
    if (paraBuf.length === 0) return;
    out.push(`<p style="margin:0 0 8px;line-height:1.5">${paraBuf.map(renderInline).join('<br />')}</p>`);
    paraBuf = [];
  };
  const closeList = () => {
    if (listOpen) { out.push('</ul>'); listOpen = false; }
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (line === '') {
      flushPara();
      closeList();
      continue;
    }

    let m;
    if ((m = line.match(/^###\s+(.*)$/))) {
      flushPara(); closeList();
      out.push(`<h3 style="margin:10px 0 6px;font-size:14px;font-weight:700;color:#1B4F72">${renderInline(m[1])}</h3>`);
      continue;
    }
    if ((m = line.match(/^##\s+(.*)$/))) {
      flushPara(); closeList();
      out.push(`<h2 style="margin:12px 0 8px;font-size:16px;font-weight:800;color:#1B4F72">${renderInline(m[1])}</h2>`);
      continue;
    }
    if ((m = line.match(/^#\s+(.*)$/))) {
      flushPara(); closeList();
      out.push(`<h1 style="margin:14px 0 10px;font-size:18px;font-weight:800;color:#1B4F72">${renderInline(m[1])}</h1>`);
      continue;
    }
    if ((m = line.match(/^\s*[-*]\s+(.*)$/))) {
      flushPara();
      if (!listOpen) { out.push('<ul style="margin:6px 0;padding-left:22px">'); listOpen = true; }
      out.push(`<li style="margin:2px 0">${renderInline(m[1])}</li>`);
      continue;
    }
    closeList();
    paraBuf.push(line);
  }
  flushPara();
  closeList();
  return out.join('\n');
}

export default function Markdown({ source = '', style = {} }) {
  const html = toHtml(source);
  if (!html) return null;
  return (
    <div
      style={{ fontSize: 13, color: '#1E293B', ...style }}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
