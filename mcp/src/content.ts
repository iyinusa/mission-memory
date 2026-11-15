// The MCP server owns no content. It reads the reviewed data and the built view
// from the web container, so the website and AI clients always show the same thing.

export const PUBLIC_ORIGIN = process.env.PUBLIC_ORIGIN ?? "https://missionmemory.kenaff.com";
const WEB_INTERNAL_URL = process.env.WEB_INTERNAL_URL ?? "http://missionmemory-web";
const TTL_MS = 60_000;

// Mirrors web/src/lib/types.ts (only the fields this server reads).
export interface Artifact {
  id: string;
  name: string;
  world: "moon" | "mars" | "beyond";
  body: string;
  status: "active" | "dormant" | "silent";
  statusNote: string;
  tier: "hero" | "story" | "map";
  summary: string;
  sources: { label: string; url: string }[];
}

interface Cached<T> {
  value: T;
  at: number;
}

const cache = new Map<string, Cached<unknown>>();

async function fetchCached<T>(path: string, parse: (r: Response) => Promise<T>): Promise<T> {
  const hit = cache.get(path) as Cached<T> | undefined;
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const res = await fetch(`${WEB_INTERNAL_URL}${path}`);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  const value = await parse(res);
  cache.set(path, { value, at: Date.now() });
  return value;
}

export async function getArtifacts(): Promise<Artifact[]> {
  const index = await fetchCached("/data/artifacts.json", (r) => r.json() as Promise<{ artifacts: Artifact[] }>);
  return index.artifacts;
}

// Mirrors web/src/lib/types.ts Story (only the fields this server reads); passed through to the view as-is.
interface Story {
  postcard: string;
  beats: { title: string; text: { younger: string; older: string } }[];
}

// Mirrors web/src/lib/types.ts StoryIndex (passed through to the view as-is).
export interface StoryIndex {
  stories: Record<string, Story>;
  summaryAudio?: string[];
  portraits?: Record<string, unknown>;
  [key: string]: unknown;
}

export function getStoryIndex(): Promise<StoryIndex> {
  return fetchCached("/data/stories.json", (r) => r.json() as Promise<StoryIndex>);
}

export async function getStory(id: string): Promise<Story | null> {
  return (await getStoryIndex()).stories[id] ?? null;
}

export function getViewHtml(): Promise<string> {
  return fetchCached("/mcp-app.html", (r) => r.text());
}

export function worldUrl(world: string): string {
  return `${PUBLIC_ORIGIN}/world/${world}`;
}

export function ghostUrl(id: string): string {
  return `${PUBLIC_ORIGIN}/ghost/${id}`;
}
