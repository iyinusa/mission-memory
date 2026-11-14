import { Link, useParams } from "react-router";
import FactCard from "../components/FactCard";
import Loading from "../components/Loading";
import StoryPlayer from "../components/StoryPlayer";
import { WORLDS } from "../lib/data";
import { useArtifacts, useStories } from "../lib/useArtifacts";
import NotFound from "./NotFound";

export default function Ghost() {
  const { ghostId } = useParams();
  const { index, error } = useArtifacts();
  const { stories, error: storyError } = useStories();

  if (error || storyError) return <p role="alert">Could not load explorers: {error ?? storyError}</p>;
  if (!index || !stories) return <Loading />;

  const artifact = index.artifacts.find((a) => a.id === ghostId);
  if (!artifact) return <NotFound />;
  const story = stories.stories[artifact.id];

  return (
    <div className="ghost-page">
      <Link className="crumb" to={`/world/${artifact.world}?ghost=${artifact.id}`}>
        ← Back to {WORLDS[artifact.world].name}
      </Link>
      {story ? <StoryPlayer key={artifact.id} artifact={artifact} story={story} /> : <FactCard artifact={artifact} />}
    </div>
  );
}
