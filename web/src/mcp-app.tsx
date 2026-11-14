// MCP Apps view: the same story player, rendered inside an MCP host's sandboxed iframe.
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
import type { Artifact, Story } from "./lib/types";

interface TuneIn {
  artifact: Artifact;
  story: Story | null;
  origin: string;
}

const app = new App({ name: "Mission Memory", version: "0.1.0" });

function View() {
  const [data, setData] = useState<TuneIn | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set before connect() so the initial tool result isn't missed.
    app.ontoolresult = (result) => {
      const d = result.structuredContent as Partial<TuneIn> | undefined;
      if (d?.artifact) setData({ artifact: d.artifact, story: d.story ?? null, origin: d.origin ?? "" });
      else setError("This explorer's signal could not be read.");
    };
    app.connect().catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <Loading />;
  return (
    <div className="embed">
      {data.story ? <StoryPlayer artifact={data.artifact} story={data.story} mediaBase={data.origin} /> : <FactCard artifact={data.artifact} />}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <View />
  </StrictMode>,
);
