import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { getArtifacts, getStory, getViewHtml, ghostUrl, PUBLIC_ORIGIN } from "./content.js";

const VIEW_URI = "ui://mission-memory/ghost.html";

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
        "List the NASA rovers, landers and probes left behind on the Moon, on Mars and beyond, with their current status. Use the returned id with tune_in.",
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

  const ui = {
    csp: { resourceDomains: [PUBLIC_ORIGIN], connectDomains: [PUBLIC_ORIGIN] },
    prefersBorder: true,
  };

  registerAppResource(server, "Mission Memory story player", VIEW_URI, { mimeType: RESOURCE_MIME_TYPE, _meta: { ui } }, async () => ({
    contents: [{ uri: VIEW_URI, mimeType: RESOURCE_MIME_TYPE, text: await getViewHtml(), _meta: { ui } }],
  }));

  return server;
}
