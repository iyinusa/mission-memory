import type { Story } from "../../lib/types";
import DragWheel from "./DragWheel";
import IonThrust from "./IonThrust";
import LaserRanging from "./LaserRanging";

interface Props {
  kind: NonNullable<Story["interaction"]>;
  mediaBase?: string;
  /** Called when the visitor starts the hands-on moment (the story narrator pauses for it). */
  onStart?: () => void;
}

export default function Interaction({ kind, mediaBase, onStart }: Props) {
  if (kind === "laser") return <LaserRanging mediaBase={mediaBase} onStart={onStart} />;
  if (kind === "drag-wheel") return <DragWheel mediaBase={mediaBase} onStart={onStart} />;
  return <IonThrust mediaBase={mediaBase} onStart={onStart} />;
}
