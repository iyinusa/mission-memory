import { useEffect, useState } from "react";
import { loadArtifacts, loadStories } from "./data";
import type { ArtifactIndex, StoryIndex } from "./types";

function useLoad<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loader()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [loader]);

  return { data, error };
}

export function useArtifacts() {
  const { data, error } = useLoad<ArtifactIndex>(loadArtifacts);
  return { index: data, error };
}

export function useStories() {
  const { data, error } = useLoad<StoryIndex>(loadStories);
  return { stories: data, error };
}
