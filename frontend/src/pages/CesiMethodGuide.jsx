import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import {
  Layers, Users, Sparkles, Bot, Award, BarChart3, ArrowRight, ChevronDown,
  GraduationCap, FlaskConical, CheckCircle2, XCircle, Lightbulb,
  Mic, PenTool, User as UserIcon, FileText, FolderOpen, MessageSquare,
  Eye, ShieldCheck, Zap, Quote,
} from 'lucide-react';

/**
 * CesiMethodGuide — Comment FlipLearn implémente la méthode de l'étude de cas.
 *
 * Page didactique qui présente la plus-value de FlipLearn par rapport à la
 * méthode classique de l'étude de cas (papier / présentiel). Structurée autour
 * de 5 piliers d'adaptation :
 *   1. Phases tracées avec validation prof à chaque étape
 *   2. Rôles tournants automatisés (Animateur / Scribe / Membre)
 *   3. Espace numérique unifié (énoncé, ressources, livrables, échanges)
 *   4. Encadrement IA adaptatif (pas correcteur, accompagnateur)
 *   5. Évaluation hybride (individuelle + collective)
 *
 * Le contenu est organisé en sections accordéon dépliables au clic, plus un
 * tableau comparatif "Méthode classique vs FlipLearn" en fin de page.
 */

/* ─── Palette ─────────────────────────────────────────────────────────────── */
const C = {
  primary:    '#1B4F72',
  primaryBg:  '#EBF3FA',
  accent:     '#D97706',
  accentBg:   '#FFFBEB',
  success:    '#10B981',
  successBg:  '#D1FAE5',
  danger:     '#DC2626',
  text:       '#1E293B',
  muted:      '#64748B',
  border:     '#E5E7EB',
  surface:    '#FFFFFF',
};

/* ─── Accordion item ──────────────────────────────────────────────────────── */
function AccordionItem({ Icon, color, bgColor, title, subtitle, badge, isOpen, onToggle, children }) {
  return (
    <div style={{
      background: C.surface,
      borderRadius: 12,
      border: `1px solid ${isOpen ? color : C.border}`,
      overflow: 'hidden',
      transition: 'border-color .2s, box-shadow .2s',
      marginBottom: 10,
      boxShadow: isOpen ? '0 2px 12px rgba(0,0,0,0.05)' : 'none',
    }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.background = '#F8FAFC'; }}
        onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 16px',
          background: isOpen ? bgColor : 'transparent',
          border: 'none', cursor: 'pointer',
          textAlign: 'left', fontFamily: 'inherit',
          transition: 'background .2s',
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: bgColor, color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: C.text }}>
              {title}
            </p>
            {badge && (
              <span style={{
                fontSize: 10.5, fontWeight: 800, letterSpacing: 0.4,
                padding: '3px 8px', borderRadius: 999,
                background: color, color: '#fff', textTransform: 'uppercase',
              }}>
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: C.muted, lineHeight: 1.4 }}>
              {subtitle}
            </p>
          )}
        </div>
        <ChevronDown
          size={20}
          style={{
            color: isOpen ? color : C.muted,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform .25s ease',
            flexShrink: 0,
          }}
        />
      </button>
      {isOpen && (
        <div style={{
          padding: '0 18px 18px 18px',
          borderTop: `1px solid ${C.border}`,
          background: '#FCFCFD',
        }}>
          <div style={{ paddingTop: 16, fontSize: 13.5, lineHeight: 1.7, color: C.text }}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Comparaison classique vs FlipLearn ──────────────────────────────────── */
function VersusBlock({ classique, fliplearn }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10,
      marginTop: 10, marginBottom: 6,
    }}>
      <div style={{
        padding: 12, borderRadius: 10,
        background: '#FEF2F2', border: '1px solid #FECACA',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <XCircle size={15} style={{ color: C.danger }} />
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: C.danger, textTransform: 'uppercase', letterSpacing: 0.4 }}>
            Méthode classique
          </p>
        </div>
        <p style={{ margin: 0, fontSize: 12.5, color: '#7F1D1D', lineHeight: 1.55 }}>
          {classique}
        </p>
      </div>
      <div style={{
        padding: 12, borderRadius: 10,
        background: '#ECFDF5', border: '1px solid #A7F3D0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <CheckCircle2 size={15} style={{ color: C.success }} />
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#047857', textTransform: 'uppercase', letterSpacing: 0.4 }}>
            Sur FlipLearn
          </p>
        </div>
        <p style={{ margin: 0, fontSize: 12.5, color: '#064E3B', lineHeight: 1.55 }}>
          {fliplearn}
        </p>
      </div>
    </div>
  );
}

/* ─── Feature row ─────────────────────────────────────────────────────────── */
function FeatureRow({ Icon, title, body, color }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: `${color}15`, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={16} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: C.text }}>
          {title}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
          {body}
        </p>
      </div>
    </div>
  );
}

/* ─── Pilier card (vue d'ensemble) ────────────────────────────────────────── */
function PilierCard({ n, Icon, title, color, bgColor }) {
  return (
    <div style={{
      padding: 14, borderRadius: 12,
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderTop: `4px solid ${color}`,
      display: 'flex', flexDirection: 'column', gap: 8,
      position: 'relative',
    }}>
      <span style={{
        position: 'absolute', top: 10, right: 12,
        fontSize: 10.5, fontWeight: 800, color: C.muted,
        background: '#F8FAFC', padding: '2px 7px', borderRadius: 999,
      }}>
        Pilier {n}
      </span>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: bgColor, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={19} />
      </div>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>
        {title}
      </p>
    </div>
  );
}

/* ─── Page principale ─────────────────────────────────────────────────────── */
export default function CesiMethodGuide() {
  const navigate = useNavigate();
  const [openSection, setOpenSection] = useState('phases');

  const toggle = (key) => setOpenSection(openSection === key ? null : key);

  return (
    <Layout title="Étude de cas">
      <article style={{
        maxWidth: 820, margin: '0 auto', padding: '4px 0 32px',
        color: C.text, fontSize: 14, lineHeight: 1.6,
      }}>

        {/* ─── Header ──────────────────────────────────────────────────── */}
        <header style={{ marginBottom: 18 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: C.primaryBg, color: C.primary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <GraduationCap size={26} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 23, fontWeight: 800, color: C.primary, lineHeight: 1.2 }}>
                Étude de cas
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: C.muted }}>
                Méthode pédagogique active · Adaptée et structurée sur FlipLearn
              </p>
            </div>
          </div>
        </header>

        {/* ─── Pourquoi adapter ────────────────────────────────────────── */}
        <div style={{
          padding: '16px 18px',
          background: '#F0F9FF',
          border: '1px solid #BAE6FD',
          borderRadius: 12,
          marginBottom: 22,
          fontSize: 13.5,
          color: '#0C4A6E',
          lineHeight: 1.7,
        }}>
          La <strong>méthode de l'étude de cas</strong> (formalisée à Harvard en 1924) est l'une
          des pédagogies actives les plus efficaces : on apprend en analysant une situation réelle,
          pas en écoutant une théorie. Mais sa mise en œuvre <strong>au format papier ou en
          présentiel pur</strong> a des limites dans le contexte universitaire algérien — promotions
          larges, encadrement prof unique, traçabilité du travail collectif difficile. FlipLearn
          numérise et structure cette méthode pour la rendre applicable à grande échelle, tout en
          conservant ce qui fait son efficacité pédagogique.
        </div>

        {/* ─── Vue d'ensemble : 5 piliers ──────────────────────────────── */}
        <h2 style={{
          margin: '0 0 6px', fontSize: 17, fontWeight: 800, color: C.primary,
        }}>
          Notre plus-value en 5 piliers
        </h2>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: C.muted }}>
          Cliquez sur un pilier ci-dessous pour explorer le détail
        </p>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10,
          marginBottom: 24,
        }}>
          <PilierCard n="1" Icon={Layers}    title="Phases tracées avec validation prof"  color="#1B4F72" bgColor="#DBEAFE" />
          <PilierCard n="2" Icon={Users}     title="Rôles tournants automatisés"           color="#9333EA" bgColor="#F3E8FF" />
          <PilierCard n="3" Icon={FolderOpen} title="Espace numérique unifié"               color="#D97706" bgColor="#FEF3C7" />
          <PilierCard n="4" Icon={Bot}       title="Encadrement IA adaptatif"              color="#0891B2" bgColor="#CFFAFE" />
          <PilierCard n="5" Icon={Award}     title="Évaluation hybride 360°"               color="#10B981" bgColor="#D1FAE5" />
        </div>

        {/* ─── Accordéon : détails des piliers ─────────────────────────── */}

        <AccordionItem
          Icon={Layers}
          color="#1B4F72"
          bgColor="#DBEAFE"
          title="Phases tracées avec validation prof"
          subtitle="3 étapes structurées, validées par le professeur à chaque passage"
          badge="Pilier 1"
          isOpen={openSection === 'phases'}
          onToggle={() => toggle('phases')}
        >
          <p style={{ margin: 0 }}>
            Sur FlipLearn, un cas pratique se déroule en <strong>3 phases successives</strong> :
            Cadrage, Travail individuel, Bilan. Chaque phase a son interface dédiée, ses livrables
            attendus, et nécessite la <strong>validation du professeur</strong> avant de passer à
            la suivante.
          </p>
          <div style={{ marginTop: 14 }}>
            <FeatureRow
              color="#1B4F72"
              Icon={Users}
              title="Phase 1 — Cadrage"
              body="Le groupe découvre l'énoncé, identifie le problème, se répartit les sous-questions. Un compte-rendu de cadrage est remonté au prof, qui valide avant de débloquer la phase suivante."
            />
            <FeatureRow
              color="#9333EA"
              Icon={PenTool}
              title="Phase 2 — Travail individuel"
              body="Chaque membre produit SON livrable personnel. Le scribe consolide en parallèle les documents collectifs. Tout est versionné et horodaté."
            />
            <FeatureRow
              color="#D97706"
              Icon={CheckCircle2}
              title="Phase 3 — Bilan"
              body="Le groupe compare les livrables, défend ses choix, présente la synthèse au prof qui évalue. Toute la trace du travail reste consultable pour la note."
            />
          </div>
          <VersusBlock
            classique="Le prof voit le résultat final mais pas le processus. Difficile de détecter qui a fait quoi, qui a décroché à mi-parcours, ou de corriger une dérive avant qu'il soit trop tard."
            fliplearn="Chaque phase est validée par le prof avant la suivante. Il voit l'avancement en temps réel, peut commenter dès le cadrage, et la trace numérique objective les contributions."
          />
        </AccordionItem>

        <AccordionItem
          Icon={Users}
          color="#9333EA"
          bgColor="#F3E8FF"
          title="Rôles tournants automatisés"
          subtitle="Animateur / Scribe / Membre, attribués et alternés par la plateforme"
          badge="Pilier 2"
          isOpen={openSection === 'roles'}
          onToggle={() => toggle('roles')}
        >
          <p style={{ margin: 0 }}>
            La méthode classique propose des rôles tournants, mais la rotation est rarement
            tenue : un même étudiant reste animateur tout le semestre, un autre devient le scribe
            par défaut. FlipLearn <strong>automatise l'attribution et la rotation</strong> sur
            l'ensemble des cas pratiques de l'année.
          </p>
          <div style={{ marginTop: 14 }}>
            <FeatureRow
              color="#9333EA"
              Icon={Mic}
              title="Animateur"
              body="Lance les séances, distribue la parole, synthétise les décisions du groupe. Sa contribution est tracée dans les comptes-rendus."
            />
            <FeatureRow
              color="#10B981"
              Icon={PenTool}
              title="Scribe"
              body="Consolide les documents collectifs (mots-clés, plan d'action, conclusions). Bénéficie d'un éditeur partagé dédié."
            />
            <FeatureRow
              color="#64748B"
              Icon={UserIcon}
              title="Membre"
              body="Produit son livrable individuel, contribue aux échanges. Tous les membres ont la même charge de travail — le rôle change la responsabilité, pas la quantité."
            />
          </div>
          <VersusBlock
            classique="Les rôles, quand ils existent, sont rarement formalisés. Le risque : toujours le même qui anime, toujours le même qui rédige. Personne ne développe les compétences manquantes."
            fliplearn="La plateforme attribue les rôles automatiquement et garantit que chaque étudiant passe par les 3 postures au cours de l'année. Compétences transverses garanties."
          />
        </AccordionItem>

        <AccordionItem
          Icon={FolderOpen}
          color="#D97706"
          bgColor="#FEF3C7"
          title="Espace numérique unifié"
          subtitle="Énoncé, ressources, livrables, échanges : tout au même endroit"
          badge="Pilier 3"
          isOpen={openSection === 'espace'}
          onToggle={() => toggle('espace')}
        >
          <p style={{ margin: 0 }}>
            En méthode classique, un cas pratique éclate : énoncé sur un polycopié, ressources
            sur Moodle, livrables par mail, discussions sur WhatsApp, évaluation sur tableur. Sur
            FlipLearn, <strong>un cas pratique = un espace unique</strong> qui regroupe tout
            le matériel et toute la production du groupe.
          </p>
          <div style={{ marginTop: 14 }}>
            <FeatureRow
              color="#D97706"
              Icon={FileText}
              title="Énoncé enrichi"
              body="Texte structuré, contexte, problématique, livrables attendus. Modifiable par le prof, accessible 24/7 par les étudiants."
            />
            <FeatureRow
              color="#D97706"
              Icon={FolderOpen}
              title="Ressources documentaires"
              body="PDFs, vidéos, liens, articles. Sélectionnés par le prof, attachés directement au cas. Pas besoin de jongler entre plateformes."
            />
            <FeatureRow
              color="#D97706"
              Icon={MessageSquare}
              title="Discussion intégrée"
              body="Le groupe échange dans un canal dédié au cas pratique. Historique préservé, recherche possible, prof peut intervenir."
            />
            <FeatureRow
              color="#D97706"
              Icon={Eye}
              title="Traçabilité complète"
              body="Tous les livrables, brouillons, échanges et validations sont conservés. Référence durable pour l'étudiant et preuve objective pour l'évaluation."
            />
          </div>
          <VersusBlock
            classique="Le matériel est dispersé (polys, mails, WhatsApp, Drive). On perd du temps à chercher, on perd des fichiers, et la trace du travail disparaît à la fin du semestre."
            fliplearn="Un seul espace par cas pratique. Tout est archivé, recherchable, et accessible des années après — utile pour le portfolio de fin de cursus."
          />
        </AccordionItem>

        <AccordionItem
          Icon={Bot}
          color="#0891B2"
          bgColor="#CFFAFE"
          title="Encadrement IA adaptatif"
          subtitle="Une IA qui accompagne l'étudiant, sans remplacer le professeur"
          badge="Pilier 4"
          isOpen={openSection === 'ia'}
          onToggle={() => toggle('ia')}
        >
          <div style={{
            marginBottom: 14, padding: '12px 14px',
            background: '#FFFBEB', borderLeft: '3px solid #D97706',
            borderRadius: 6, fontSize: 13, color: '#78350F', lineHeight: 1.6,
          }}>
            <strong>Notre position pédagogique :</strong> l'IA n'est <em>pas</em> un correcteur
            qui donne la bonne réponse, ni un prédicteur d'échec. C'est un <strong>accompagnateur
            adaptatif</strong> qui aide l'étudiant à réfléchir, à structurer, à débloquer une
            difficulté — exactement comme le ferait un tuteur disponible 24/7.
          </div>
          <div style={{ marginTop: 4 }}>
            <FeatureRow
              color="#0891B2"
              Icon={Lightbulb}
              title="Aide à la problématisation"
              body="L'étudiant peut demander à l'IA de l'aider à reformuler le problème, à explorer des angles d'analyse, à identifier les concepts pertinents — sans recevoir de réponse toute faite."
            />
            <FeatureRow
              color="#0891B2"
              Icon={Sparkles}
              title="Suggestions de pistes"
              body="Face à un blocage, l'IA propose des questions à se poser, des lectures complémentaires, des angles de réflexion. L'étudiant garde l'initiative du raisonnement."
            />
            <FeatureRow
              color="#0891B2"
              Icon={ShieldCheck}
              title="Garde-fous pédagogiques"
              body="L'IA refuse explicitement de produire le livrable à la place de l'étudiant. Elle l'aide à apprendre, pas à tricher. Cette discipline est documentée dans nos prompts système."
            />
          </div>
          <VersusBlock
            classique="L'étudiant qui bloque le soir avant le rendu est seul avec son problème. Pas de tuteur disponible, pas de canal d'aide rapide. Résultat : abandon, ou copier-coller depuis un autre groupe."
            fliplearn="L'IA est disponible 24/7 pour débloquer une réflexion, sans donner la réponse. L'étudiant avance dans son raisonnement même la nuit du rendu."
          />
        </AccordionItem>

        <AccordionItem
          Icon={Award}
          color="#10B981"
          bgColor="#D1FAE5"
          title="Évaluation hybride 360°"
          subtitle="Note individuelle + collective, traçable et argumentée"
          badge="Pilier 5"
          isOpen={openSection === 'eval'}
          onToggle={() => toggle('eval')}
        >
          <p style={{ margin: 0 }}>
            L'évaluation d'un cas pratique pose deux questions difficiles : <strong>comment noter
            le travail individuel sans pénaliser un bon groupe ?</strong> et <strong>comment noter
            le collectif sans avantager un passager clandestin ?</strong> FlipLearn répond avec
            une évaluation à deux dimensions, appuyée par la trace numérique du travail.
          </p>
          <div style={{ marginTop: 14 }}>
            <FeatureRow
              color="#10B981"
              Icon={UserIcon}
              title="Note individuelle"
              body="Sur le livrable personnel de l'étudiant. Le prof la fixe en se référant à la grille du cas. C'est la note qui pèse le plus."
            />
            <FeatureRow
              color="#10B981"
              Icon={Users}
              title="Note collective"
              body="Sur les documents du groupe consolidés par le scribe. Identique pour tous les membres. Récompense la qualité de la dynamique collective."
            />
            <FeatureRow
              color="#10B981"
              Icon={BarChart3}
              title="Trace objectivante"
              body="Le prof voit l'historique des contributions, les validations de phases, les échanges. La note est argumentée par des données, pas par une impression."
            />
            <FeatureRow
              color="#10B981"
              Icon={Zap}
              title="Détection des décrochages"
              body="Si un membre n'a rien produit en phase 2 ou n'a pas validé son rôle, c'est visible dès la phase Bilan. Le prof peut intervenir avant le rendu final, pas après."
            />
          </div>
          <VersusBlock
            classique="Le prof note sur un dossier collectif final. Difficile de différencier les contributions. Les bons étudiants tirent les autres ; les passagers clandestins passent inaperçus."
            fliplearn="Deux notes (individuelle + collective) appuyées par la trace numérique. Chaque étudiant est responsabilisé sur son livrable propre, sans casser la dynamique de groupe."
          />
        </AccordionItem>

        {/* ─── Tableau récap ──────────────────────────────────────────── */}
        <h2 style={{
          margin: '32px 0 6px', fontSize: 17, fontWeight: 800, color: C.primary,
        }}>
          En résumé : ce que FlipLearn apporte
        </h2>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: C.muted }}>
          Cinq verrous levés par notre adaptation de la méthode
        </p>

        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          {[
            ['Promotions larges', 'Un prof seul ne peut pas suivre 30 groupes en présentiel', 'Tableau de bord prof : avancement de tous les groupes en un écran'],
            ['Traçabilité', 'Le travail intermédiaire disparaît à la fin du semestre', 'Tout est archivé, recherchable, restituable en portfolio'],
            ['Équité', 'Passager clandestin difficile à détecter', 'Contribution individuelle visible par phase'],
            ['Disponibilité', 'Pas de tuteur disponible 24/7 pour débloquer', 'IA d\'accompagnement (pas de correction) toujours accessible'],
            ['Rotation des rôles', 'Théoriquement prévue, rarement tenue', 'Attribution et alternance automatiques sur l\'année'],
          ].map(([axe, classique, fliplearn], i, arr) => (
            <div key={axe} style={{
              display: 'grid', gridTemplateColumns: '120px 1fr 1fr',
              borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
              fontSize: 12.5,
            }}>
              <div style={{
                padding: '12px 14px', background: '#F8FAFC',
                fontWeight: 700, color: C.text, borderRight: `1px solid ${C.border}`,
              }}>
                {axe}
              </div>
              <div style={{
                padding: '12px 14px', color: '#7F1D1D',
                background: '#FEF2F2', borderRight: `1px solid ${C.border}`, lineHeight: 1.55,
              }}>
                {classique}
              </div>
              <div style={{
                padding: '12px 14px', color: '#064E3B',
                background: '#ECFDF5', lineHeight: 1.55,
              }}>
                {fliplearn}
              </div>
            </div>
          ))}
        </div>

        {/* ─── Citation ──────────────────────────────────────────────── */}
        <div style={{
          marginTop: 22, padding: '14px 18px',
          background: C.primaryBg, borderLeft: `3px solid ${C.primary}`,
          borderRadius: 6,
        }}>
          <p style={{ margin: 0, fontSize: 13.5, fontStyle: 'italic', color: C.text, lineHeight: 1.7 }}>
            <Quote size={13} style={{ display: 'inline', marginRight: 6, color: C.primary }} />
            FlipLearn ne remplace pas la pédagogie active, il la rend praticable à l'échelle d'une
            université. La méthode reste la même — la mise en œuvre devient possible.
          </p>
        </div>

        {/* ─── CTA final ──────────────────────────────────────────────── */}
        <div style={{
          marginTop: 28,
          padding: 22,
          background: `linear-gradient(135deg, ${C.primaryBg}, ${C.accentBg})`,
          borderRadius: 14,
          border: `1px solid ${C.border}`,
          textAlign: 'center',
        }}>
          <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: C.primary }}>
            Prêt à passer à la pratique ?
          </p>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: C.muted }}>
            Découvrez les cas pratiques disponibles dans vos cours
          </p>
          <button
            type="button"
            onClick={() => navigate('/cas-pratiques')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 22px', borderRadius: 10,
              background: `linear-gradient(135deg, ${C.primary}, #2874A6)`,
              color: 'white', border: 'none',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(27,79,114,0.25)',
              fontFamily: 'inherit',
            }}
          >
            <FlaskConical size={15} />
            Voir mes cas pratiques
            <ArrowRight size={15} />
          </button>
        </div>

      </article>
    </Layout>
  );
}
