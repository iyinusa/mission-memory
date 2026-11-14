import type { Story } from "../../lib/types";
import DragWheel from "./DragWheel";
import IonThrust from "./IonThrust";
import LaserRanging from "./LaserRanging";

export default function Interaction({ kind }: { kind: NonNullable<Story["interaction"]> }) {
  if (kind === "laser") return <LaserRanging />;
  if (kind === "drag-wheel") return <DragWheel />;
  return <IonThrust />;
}
