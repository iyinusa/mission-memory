import { useEffect, useState } from "react";
import { loadArtifacts } from "./data";
import type { ArtifactIndex } from "./types";

export function useArtifacts() {
  const [index, setIndex] = useState<ArtifactIndex | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadArtifacts()
      .then(setIndex)
      .catch((e: Error) => setError(e.message));
  }, []);

  return { index, error };
}
