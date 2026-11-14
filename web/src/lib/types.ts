// Data contract shared by the web app, the MCP view and the build scripts.
// Every fact shown to a learner must trace back to an entry in `sources` / `evidence`.

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
  /** Where it rests: "Moon", "Mars", "Orbiting Ceres", "Leaving the Solar System", ... */
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

export type LevelId = "younger" | "older";
export type BeatKey = "why" | "how" | "discovered" | "lastDay" | "now";

export interface BeatSource extends Source {
  quote: string;
}

/** A photo or illustration from the NASA Image and Video Library (scripts/images.py). */
export interface BeatImage {
  src: string;
  alt: string;
  caption: string;
  credit: string;
  illustration: boolean;
  url: string;
}

export interface Beat {
  key: BeatKey;
  title: string;
  text: Record<LevelId, string>;
  sources: BeatSource[];
  image?: BeatImage;
}

export interface Story {
  reviewStatus: "draft" | "approved";
  interaction: "laser" | "drag-wheel" | "ion-thrust" | null;
  postcard: string;
  beats: Beat[];
  /** Narration MP3s exist at /media/audio/<id>/<level>-<beat>.mp3 for these levels. */
  audio?: LevelId[];
}

export interface StoryIndex {
  generatedAt: string;
  levels: Record<LevelId, string>;
  stories: Record<string, Story>;
  /** Map-only explorers whose NASA summary is narrated at /media/audio/<id>/summary.mp3. */
  summaryAudio?: string[];
  /** Each explorer's hardware photo (square thumbnail), keyed by explorer id. */
  portraits?: Record<string, BeatImage>;
}
