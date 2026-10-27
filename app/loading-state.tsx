export default function LoadingState({ label = "Getting your court ready", compact = false }: { label?: string; compact?: boolean }) {
  return <div className={`wb-loading${compact ? " wb-loading-compact" : ""}`} role="status" aria-live="polite" aria-busy="true">
    <div className="wb-loading-mark" aria-hidden="true"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="18"/><path d="M6 24h36M24 6v36M11 11c17 4 22 9 26 26M37 11C20 15 15 20 11 37"/></svg></div>
    <p>{label}<span className="wb-loading-dots" aria-hidden="true"><i/><i/><i/></span></p>
    {!compact && <div className="wb-loading-preview" aria-hidden="true"><span/><span/><span/></div>}
  </div>;
}
