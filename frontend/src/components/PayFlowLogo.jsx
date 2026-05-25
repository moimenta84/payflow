function PayFlowLogo({ size = 48, className = '' }) {
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
