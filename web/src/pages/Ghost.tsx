import { useParams } from "react-router";
import Loading from "../components/Loading";
import { useArtifacts } from "../lib/useArtifacts";
import GhostCard from "./GhostCard";
import NotFound from "./NotFound";

export default function Ghost() {
  const { ghostId } = useParams();
  const { index, error } = useArtifacts();

  if (error) return <p role="alert">Could not load explorers: {error}</p>;
  if (!index) return <Loading />;

  const artifact = index.artifacts.find((a) => a.id === ghostId);
  if (!artifact) return <NotFound />;

  return <GhostCard artifact={artifact} />;
}
