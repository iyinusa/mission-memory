import { Link, useParams } from "react-router";
import Loading from "../components/Loading";
import Postcard from "../components/Postcard";
import { useArtifacts, useStories } from "../lib/useArtifacts";
import NotFound from "./NotFound";

/** Opened from the QR code on a phone: just the postcard, ready to save or share. */
export default function PostcardPage() {
  const { ghostId } = useParams();
  const { index, error } = useArtifacts();
  const { stories, error: storyError } = useStories();

  if (error || storyError) return <p role="alert">Could not load this postcard: {error ?? storyError}</p>;
  if (!index || !stories) return <Loading />;
  const artifact = index.artifacts.find((a) => a.id === ghostId);
  const story = artifact && stories.stories[artifact.id];
  if (!artifact || !story) return <NotFound />;

  // The name travels in the #fragment, so it never reaches the server.
  const to = new URLSearchParams(window.location.hash.slice(1)).get("to") ?? undefined;

  return (
    <div className="ghost-page">
      <Postcard artifact={artifact} message={story.postcard} initialName={to} showQr={false} />
      <p>
        <Link to={`/ghost/${artifact.id}`}>Hear {artifact.name}'s story</Link>
      </p>
    </div>
  );
}
