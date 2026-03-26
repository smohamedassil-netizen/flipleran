/**
 * FlipLearn SVG Logo Component
 *
 * Usage:
 *   <Logo />                        — full logo (icon + text), ~200px wide
 *   <Logo variant="full" />         — same as above
 *   <Logo variant="icon" />         — icon only, 36px square
 *   <Logo variant="icon" size={48} /> — icon only, custom size
 */

const PRIMARY = '#1B4F72';
const ACCENT  = '#2874A6';

function BookIcon({ size = 36 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Open book — left page */}
      <path
        d="M8 48V18a4 4 0 0 1 4-4h16c2 0 4 1.5 4 3.5V50c0-2-2-3.5-4-3.5H12a4 4 0 0 1-4-4z"
        fill={PRIMARY}
        opacity="0.9"
      />
      {/* Open book — right page */}
      <path
        d="M56 48V18a4 4 0 0 0-4-4H36c-2 0-4 1.5-4 3.5V50c0-2 2-3.5 4-3.5h16a4 4 0 0 0 4-4z"
        fill={ACCENT}
        opacity="0.9"
      />
      {/* Book spine highlight */}
      <path
        d="M32 17.5V50"
        stroke="#fff"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
      {/* Lines on left page */}
      <path d="M14 24h12M14 29h10M14 34h8" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      {/* Lines on right page */}
      <path d="M38 24h12M38 29h10M38 34h8" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />

      {/* Lightbulb above the book */}
      <circle cx="32" cy="7" r="5.5" fill={ACCENT} opacity="0.85" />
      <path
        d="M30 12.5h4v2a2 2 0 0 1-4 0v-2z"
        fill={ACCENT}
        opacity="0.85"
      />
      {/* Filament */}
      <path
        d="M32 4.5v2M30 6l1 1.5M34 6l-1 1.5"
        stroke="#fff"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.8"
      />
      {/* Light rays */}
      <path
        d="M25 7h-2M39 7h2M27 3l-1-1.5M37 3l1-1.5"
        stroke={ACCENT}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}

export default function Logo({ variant = 'full', size }) {
  if (variant === 'icon') {
    return <BookIcon size={size ?? 36} />;
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        userSelect: 'none',
      }}
    >
      <BookIcon size={size ?? 36} />
      <span
        style={{
          fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
          fontWeight: 800,
          fontSize: 22,
          letterSpacing: '-0.03em',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ color: PRIMARY }}>Flip</span>
        <span style={{ color: ACCENT }}>Learn</span>
      </span>
    </div>
  );
}
