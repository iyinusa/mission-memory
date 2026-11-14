import type { Artifact, ArtifactIndex, WorldId } from "./types";

export const WORLDS: Record<WorldId, { name: string; tagline: string }> = {
  moon: { name: "The Moon", tagline: "Where it all began" },
  mars: { name: "Mars", tagline: "The red frontier" },
  beyond: { name: "Beyond", tagline: "Asteroids, Ceres and the edge of the Sun's reach" },
};

let cache: Promise<ArtifactIndex> | null = null;

export function loadArtifacts(base = ""): Promise<ArtifactIndex> {
  cache ??= fetch(`${base}/data/artifacts.json`).then((r) => {
    if (!r.ok) throw new Error(`artifacts.json: HTTP ${r.status}`);
    return r.json() as Promise<ArtifactIndex>;
  });
  return cache;
}

export function byWorld(index: ArtifactIndex, world: WorldId): Artifact[] {
  return index.artifacts.filter((a) => a.world === world);
}
