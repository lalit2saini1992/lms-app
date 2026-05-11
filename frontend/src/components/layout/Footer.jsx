export default function Footer() {
  const year = new Date().getFullYear();

  return (
    // Only on mobile (hidden on lg+)
    <footer
      className="lg:hidden flex-shrink-0"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
      }}
    >
      <div
        className="flex flex-col items-center justify-center gap-1 px-4 py-3 pb-20 text-center"
      >
        {/* Copyright */}
        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          © {year}{' '}
          <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>LMS Pro</span>
          {' '}· All rights reserved
        </p>

        {/* Developed by */}
        <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
          Developed with
          <span className="text-red-500">♥</span>
          by
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
      </div>
    </footer>
  );
}
