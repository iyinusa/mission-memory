import type { Status } from "../lib/types";

export const STATUS_LABEL: Record<Status, string> = { active: "Still working", dormant: "Resting", silent: "Silent" };

export default function StatusChip({ status, note }: { status: Status; note?: string }) {
  return (
    <p className={`chip status-${status}`}>
      <strong>{STATUS_LABEL[status]}</strong>
      {note && <span> · {note}</span>}
    </p>
  );
}
