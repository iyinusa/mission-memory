// MCP Apps view: the same story player and world tuner, rendered inside an MCP host's sandboxed iframe.
// Data arrives through the tool result; media is loaded from the public origin.
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "@fontsource/space-grotesk/700.css";
import "./styles.css";

import { App } from "@modelcontextprotocol/ext-apps";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import FactCard from "./components/FactCard";
import Loading from "./components/Loading";
import StoryPlayer from "./components/StoryPlayer";
import WorldTuner from "./components/WorldTuner";
import { WORLDS } from "./lib/data";
import type { Artifact, Story, StoryIndex, WorldId } from "./lib/types";

/** tune_in: one explorer's story. */
interface TuneIn {
  artifact: Artifact;
  story: Story | null;
  origin: string;
}

/** explore_world: the Tune In dial for one world, with the stories of its explorers. */
interface Explore {
  world: WorldId;
  ghosts: Artifact[];
  stories: StoryIndex;
  origin: string;
}

type Data = ({ kind: "story" } & TuneIn) | ({ kind: "world" } & Explore);

const app = new App({ name: "Mission Memory", version: "0.1.0" });

function Explorer({ artifact, story, origin }: TuneIn) {
  return story ? <StoryPlayer artifact={artifact} story={story} mediaBase={origin} /> : <FactCard artifact={artifact} />;
}

/** The world tuner; opening an explorer swaps in its story, and Back returns to the dial on that explorer. */
function World({ world, ghosts, stories, origin }: Explore) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const open = ghosts.find((g) => g.id === openId);

  if (open) {
    return (
      <>
        <button type="button" className="button small embed-back" onClick={() => setOpenId(null)}>
          ← Back to {WORLDS[world].name}
        </button>
        <Explorer artifact={open} story={stories.stories[open.id] ?? null} origin={origin} />
      </>
    );
  }
  return (
    <WorldTuner
      world={world}
      ghosts={ghosts}
      stories={stories}
      mediaBase={origin}
      startId={lastId}
      onPick={setLastId}
      open={(g) => (
        <button
          type="button"
          className="button primary"
          onClick={() => {
            setLastId(g.id);
            setOpenId(g.id);
            window.scrollTo(0, 0);
          }}
        >
          {g.tier === "map" ? "NASA's record ▶" : "Hear its story ▶"}
        </button>
      )}
    />
  );
}

function View() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Which tool opened this view, and with what: lets the view ask again if the data didn't come through.
    let args: Record<string, unknown> = {};
    const accept = (content: unknown) => {
      const d = content as Partial<TuneIn & Explore> | undefined;
      if (d?.world && d.ghosts && d.stories) setData({ kind: "world", world: d.world, ghosts: d.ghosts, stories: d.stories, origin: d.origin ?? "" });
      else if (d?.artifact) setData({ kind: "story", artifact: d.artifact, story: d.story ?? null, origin: d.origin ?? "" });
      else return false;
      return true;
    };
    const say = (result: { content?: { type: string; text?: string }[] }) =>
      result.content?.find((c) => c.type === "text")?.text?.split("\n")[0] ?? "";
    // Set before connect() so the initial tool input and result aren't missed.
    app.ontoolinput = (p) => {
      args = p.arguments ?? {};
    };
    app.ontoolresult = async (result) => {
      if (accept(result.structuredContent)) return;
      if (result.isError) return setError(`This explorer's signal could not be read. ${say(result)}`);
      // A host may pass the result on without its data: ask the server for it directly.
      const name = typeof args.world === "string" ? "explore_world" : typeof args.ghost === "string" ? "tune_in" : null;
      if (name) {
        try {
          const again = await app.callServerTool({ name, arguments: args });
          if (accept(again.structuredContent)) return;
        } catch {
          /* fall through to the message below */
        }
      }
      setError("This explorer's signal could not be read. Try asking again.");
    };
    app.connect().catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <Loading />;
  return <div className="embed">{data.kind === "world" ? <World {...data} /> : <Explorer {...data} />}</div>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <View />
  </StrictMode>,
);
