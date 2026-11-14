import { useParams } from "react-router";
import FactCard from "../components/FactCard";
import Loading from "../components/Loading";
import StoryPlayer from "../components/StoryPlayer";
import { useArtifacts, useStories } from "../lib/useArtifacts";

export default function Embed() {
  const { ghostId } = useParams();
  const { index, error } = useArtifacts();
  const { stories, error: storyError } = useStories();

  if (error || storyError) return <p role="alert">Could not load explorers: {error ?? storyError}</p>;
  if (!index || !stories) return <Loading />;

  const artifact = index.artifacts.find((a) => a.id === ghostId);
  if (!artifact) return <p>No explorer called “{ghostId}”.</p>;
  const story = stories.stories[artifact.id];

  return <div className="embed">{story ? <StoryPlayer artifact={artifact} story={story} /> : <FactCard artifact={artifact} />}</div>;
}
