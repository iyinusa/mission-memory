import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { getArtifacts, getStory, getStoryIndex, getViewHtml, ghostUrl, PUBLIC_ORIGIN, worldUrl } from "./content.js";

// Hosts cache a view by its URI, so a changed view needs a new one: bump the version whenever
// the view's data contract changes (v2: the world tuner joined the story player).
const VIEW_URI = "ui://mission-memory/explorer-v2.html";
// Earlier chats still point at the first URI; serve them the current view too.
const LEGACY_VIEW_URIS = ["ui://mission-memory/ghost.html"];

export function createServer(): McpServer {
  const server = new McpServer({
    name: "mission-memory",
    title: "Mission Memory",
    version: "0.1.0",
    description: "Narrated stories of the NASA rovers, landers and probes left on the Moon, Mars and beyond, built from NASA's NSSDCA catalog.",
    websiteUrl: PUBLIC_ORIGIN,
    icons: [
      { src: `${PUBLIC_ORIGIN}/favicon.svg`, mimeType: "image/svg+xml", sizes: ["any"] },
      { src: `${PUBLIC_ORIGIN}/apple-touch-icon.png`, mimeType: "image/png", sizes: ["180x180"] },
    ],
  });

  server.registerTool(
    "list_ghosts",
    {
      title: "List ghost explorers",
      description:
        "List the NASA rovers, landers and probes left behind on the Moon, on Mars and beyond, with their current status. Use the returned id with tune_in. To let someone browse a world visually, use explore_world instead.",
      inputSchema: z.object({
        world: z.enum(["moon", "mars", "beyond"]).optional().describe("Only list explorers on this world"),
      }),
    },
    async ({ world }) => {
      const ghosts = (await getArtifacts())
        .filter((a) => !world || a.world === world)
        .map(({ id, name, world, body, status, statusNote }) => ({ id, name, world, body, status, statusNote }));
      const text = ghosts.length
        ? ghosts.map((g) => `- ${g.name} (${g.id}), ${g.body}: ${g.statusNote}`).join("\n")
        : "No explorers found.";
      return { content: [{ type: "text", text }], structuredContent: { ghosts } };
    },
  );

  registerAppTool(
    server,
    "tune_in",
    {
      title: "Tune in to a ghost explorer",
      description:
        "Open the story of one NASA explorer left behind, told in its own voice, with sources from NASA's NSSDCA catalog. Get ids from list_ghosts.",
      inputSchema: z.object({
        ghost: z.string().describe("Explorer id from list_ghosts, e.g. 'spirit'"),
      }),
      _meta: { ui: { resourceUri: VIEW_URI } },
    },
    async ({ ghost }) => {
      const artifact = (await getArtifacts()).find((a) => a.id === ghost);
      if (!artifact) {
        return { isError: true, content: [{ type: "text", text: `No explorer with id "${ghost}". Call list_ghosts.` }] };
      }
      const story = await getStory(artifact.id);
      // Text fallback for clients that cannot render the view: the story in the explorer's own words.
      const told = story ? story.beats.map((b) => `${b.title}: ${b.text.younger}`) : [artifact.summary];
      const text = [
        `${artifact.name}, ${artifact.body}. ${artifact.statusNote}.`,
        ...told,
        `Full story: ${ghostUrl(artifact.id)}`,
        `Sources: ${artifact.sources.map((s) => s.url).join(", ")}`,
      ].join("\n\n");
      return { content: [{ type: "text", text }], structuredContent: { artifact, story, origin: PUBLIC_ORIGIN } };
    },
  );

  registerAppTool(
    server,
    "explore_world",
    {
      title: "Explore a world",
      description:
        "Open the Tune In dial for the Moon, Mars or beyond: it scans for the NASA explorers left behind there, shows each one on a 3D globe (or a map of the solar system for 'beyond'), and opens any explorer's story. Use when someone wants to browse or discover the explorers on a world.",
      inputSchema: z.object({
        world: z.enum(["moon", "mars", "beyond"]).describe("Which world to tune in to: 'moon', 'mars', or 'beyond' (asteroids, Ceres and probes leaving the solar system)"),
      }),
      _meta: { ui: { resourceUri: VIEW_URI } },
    },
    async ({ world }) => {
      const ghosts = (await getArtifacts()).filter((a) => a.world === world);
      const index = await getStoryIndex();
      const ids = new Set(ghosts.map((g) => g.id));
      const pick = <T,>(rec: Record<string, T> | undefined) => Object.fromEntries(Object.entries(rec ?? {}).filter(([id]) => ids.has(id)));
      // Only this world's stories and photos, so the view has everything it needs without another call.
      const stories = { ...index, stories: pick(index.stories), portraits: pick(index.portraits), summaryAudio: (index.summaryAudio ?? []).filter((id) => ids.has(id)) };
      const text = [
        `Explorers left behind (${world}):`,
        ...ghosts.map((g) => `- ${g.name} (${g.id}): ${g.statusNote}${index.stories[g.id] ? " (full story)" : ""}`),
        `Tune in on the web: ${worldUrl(world)}`,
      ].join("\n");
      return { content: [{ type: "text", text }], structuredContent: { world, ghosts, stories, origin: PUBLIC_ORIGIN } };
    },
  );

  const ui = {
    csp: { resourceDomains: [PUBLIC_ORIGIN], connectDomains: [PUBLIC_ORIGIN] },
    prefersBorder: true,
  };

  for (const uri of [VIEW_URI, ...LEGACY_VIEW_URIS]) {
    registerAppResource(server, uri === VIEW_URI ? "Mission Memory explorer view" : "Mission Memory explorer view (earlier chats)", uri, { mimeType: RESOURCE_MIME_TYPE, _meta: { ui } }, async () => ({
      contents: [{ uri, mimeType: RESOURCE_MIME_TYPE, text: await getViewHtml(), _meta: { ui } }],
    }));
  }

  return server;
}
