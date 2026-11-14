// MCP Apps view: the same story player, rendered inside an MCP host's sandboxed iframe.
// Data arrives through the tool result; media is loaded from the public origin.
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "@fontsource/space-grotesk/700.css";
import "./styles.css";

import { App } from "@modelcontextprotocol/ext-apps";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import Loading from "./components/Loading";
import GhostCard from "./pages/GhostCard";
import type { Artifact } from "./lib/types";

const app = new App({ name: "Mission Memory", version: "0.1.0" });

function View() {
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set before connect() so the initial tool result isn't missed.
    app.ontoolresult = (result) => {
      const data = result.structuredContent as { artifact?: Artifact } | undefined;
      if (data?.artifact) setArtifact(data.artifact);
      else setError("This explorer's signal could not be read.");
    };
    app.connect().catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p role="alert">{error}</p>;
  if (!artifact) return <Loading />;
  return (
    <div className="embed">
      <GhostCard artifact={artifact} />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <View />
  </StrictMode>,
);
