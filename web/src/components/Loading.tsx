import { LogoMark } from "./Logo";

export default function Loading({ label = "Searching for a signal…" }: { label?: string }) {
  return (
    <div className="loading tuning" role="status" aria-live="polite">
      <LogoMark size={56} />
      <span>{label}</span>
    </div>
  );
}
