export default function BallIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 7.5l3 2-1 3.5h-4L9 9.5l3-2z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6.5 11l2.5-1.5 1 3-2 2.5-2-2.5 0-2z" stroke="currentColor" strokeWidth="1.1" />
      <path d="M17.5 11l-2.5-1.5-1 3 2 2.5 2-2.5 0-2z" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}
