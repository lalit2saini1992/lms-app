export default function Footer() {
  const year = new Date().getFullYear();

  return (
    // Desktop only — hidden on mobile completely
    <footer
      className="hidden lg:flex flex-shrink-0 items-center justify-center px-4 py-2"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
      }}
    >
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        © {year}{' '}
        <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>LMS Pro</span>
        {' '}· All rights reserved · Developed with{' '}
        <span className="text-red-500">♥</span>
        {' '}by{' '}
        <span
          className="font-bold"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Lalit
        </span>
      </p>
    </footer>
  );
}
