import { Link } from "react-router";
import Loading from "../components/Loading";
import { WORLDS } from "../lib/data";
import { useMissionLog } from "../lib/missionLog";
import { useArtifacts, useStories } from "../lib/useArtifacts";
import type { WorldId } from "../lib/types";

/** Every explorer as a stamp: found ones in colour, the rest waiting to be tuned in. */
export default function MissionLogPage() {
  const { index } = useArtifacts();
  const { stories } = useStories();
  const log = useMissionLog();
  if (!index || !stories) return <Loading />;

  const total = index.artifacts.length;
  const storyCount = Object.keys(stories.stories).length;

  return (
    <section className="log">
      <h1>📡 Mission Log</h1>
      <p className="lede">
        You've found <strong>{log.found.length}</strong> of {total} explorers and heard <strong>{log.heard.length}</strong> of {storyCount} stories.
      </p>
      <div className="log-bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={log.found.length} aria-label="Explorers found">
        <span style={{ width: `${(log.found.length / total) * 100}%` }} />
      </div>

      {(Object.keys(WORLDS) as WorldId[]).map((w) => (
        <div key={w} className="log-world">
          <h2>{WORLDS[w].name}</h2>
          <ul className="stamps">
            {index.artifacts
              .filter((a) => a.world === w)
              .map((a) => {
                const found = log.found.includes(a.id);
                const heard = log.heard.includes(a.id);
                const photo = stories.portraits?.[a.id]?.src;
                return (
                  <li key={a.id}>
                    <Link to={found ? `/ghost/${a.id}` : `/world/${w}`} className={`stamp${found ? " found" : ""}`}>
                      <span className="stamp-photo">
                        {photo && <img src={photo} alt="" />}
                        {!found && <em aria-hidden="true">?</em>}
                        {heard && (
                          <b className="stamp-star" title="Story heard">
                            ★
                          </b>
                        )}
                      </span>
                      <span className="stamp-name">{found ? a.name : "Not found yet"}</span>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
      <p className="si-note">Your Mission Log is kept only on this device. Nothing is sent anywhere.</p>
    </section>
  );
}
