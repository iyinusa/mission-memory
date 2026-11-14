import type { Artifact, ArtifactIndex, StoryIndex, WorldId } from "./types";

export const WORLDS: Record<WorldId, { name: string; tagline: string; dial: string }> = {
  moon: { name: "The Moon", tagline: "Where it all began", dial: "Longitude" },
  mars: { name: "Mars", tagline: "The red frontier", dial: "Longitude" },
  beyond: { name: "Beyond", tagline: "Asteroids, Ceres and the edge of the Sun's reach", dial: "Launch year" },
};

const cache = new Map<string, Promise<unknown>>();

function load<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(path).then((r) => {
        if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
        return r.json();
      }),
    );
  }
  return cache.get(path) as Promise<T>;
}

export const loadArtifacts = () => load<ArtifactIndex>("/data/artifacts.json");
export const loadStories = () => load<StoryIndex>("/data/stories.json");

export function byWorld(index: ArtifactIndex, world: WorldId): Artifact[] {
  return index.artifacts.filter((a) => a.world === world);
}

/** Where a ghost sits on its world's Tune In dial: longitude on Moon/Mars, launch year beyond. */
export function dialValue(a: Artifact): number {
  if (a.world === "beyond") return a.launched ? Number(a.launched.slice(0, 4)) + Number(a.launched.slice(5, 7)) / 12 : 0;
  return a.lon ?? 0;
}

export function formatDial(world: WorldId, v: number): string {
  if (world === "beyond") return String(Math.floor(v));
  const deg = Math.abs(v).toFixed(1);
  return v === 0 ? "0°" : `${deg}°${v > 0 ? "E" : "W"}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function formatLatLon(lat: number, lon: number): string {
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "W"}`;
}
