// Logotipo de PayFlow como SVG (escalable y nítido a cualquier tamaño). Dos variantes: dorada y blanca.
function PayFlowLogo({ size = 48, className = '', variant = 'golden' }) {
  if (variant === 'golden') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 120 120"
        fill="none"
        width={size}
        height={size}
        className={className}
        aria-label="PayFlow"
      >
        <defs>
          <linearGradient id="goldenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fcd34d" stopOpacity={1} />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity={1} />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="60" fill="url(#goldenGrad)" />
        <rect x="25" y="40" width="70" height="42" rx="6" stroke="white" strokeWidth="3.5" fill="none" />
        <circle cx="60" cy="55" r="8" stroke="white" strokeWidth="2.5" fill="none" />
        <path d="M60 47v16M52 55h16" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M35 32 Q60 20 85 32" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    );
  }

  // Versión blanca original para compatibilidad
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      width={size}
      height={size}
      className={className}
      aria-label="PayFlow"
    >
      <rect width="64" height="64" rx="16" fill="rgba(255,255,255,0.15)" />
      <rect width="36" height="22" x="14" y="21" rx="3" stroke="white" strokeWidth="2.5" fill="none" />
      <circle cx="32" cy="32" r="4" stroke="white" strokeWidth="2.5" fill="none" />
      <path d="M20 32h.5M43.5 32H44" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 14l8-4 8 4" stroke="#a5f3fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export default PayFlowLogo;
