// Data contract shared by the web app, the MCP view and the build scripts.
// Every fact shown to a learner must trace back to an entry in `sources`.

export type WorldId = "moon" | "mars" | "beyond";

/** active = still doing science, dormant = parked/unpowered, silent = contact lost for good */
export type Status = "active" | "dormant" | "silent";

/** hero = full story + hands-on moment, story = narrated story, map = map pin + fact card */
export type Tier = "hero" | "story" | "map";

export interface Source {
  label: string;
  url: string;
}

/** A verbatim quote from a NASA page, checked by scripts/ingest.py. */
export interface Evidence {
  claim: string;
  quote: string;
  url: string;
  label: string;
}

export interface Site {
  label: string;
  lat: number;
  lon: number;
}

export interface Artifact {
  id: string;
  name: string;
  world: WorldId;
  /** Where it rests: "Moon", "Mars", "Ceres", "433 Eros", "Heliocentric orbit", "Interstellar space" */
  body: string;
  nssdcaId: string | null;
  nssdcaUrl: string | null;
  missionUrl: string | null;
  /** Landing site, degrees, east-positive longitude. null for things that never landed. */
  lat: number | null;
  lon: number | null;
  launched: string | null;
  arrived: string | null;
  lastContact: string | null;
  status: Status;
  statusNote: string;
  tier: Tier;
  summary: string;
  /** Extra pins when one ghost rests at several places (e.g. the three retroreflectors). */
  sites: Site[];
  evidence: Evidence[];
  sources: Source[];
}

export interface ArtifactIndex {
  generatedAt: string;
  artifacts: Artifact[];
}
