import { useCallback, useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
import Logo from "../components/Logo";
import Starfield from "../components/Starfield";
import { useMissionLog, useNewStamp } from "../lib/missionLog";
import { useArtifacts } from "../lib/useArtifacts";

export default function Layout() {
  const log = useMissionLog();
  const { index } = useArtifacts();
  const [stamp, setStamp] = useState<string | null>(null);
  // One night sky behind every page: lively on the landing page, calm where kids read and explore.
  const lively = useLocation().pathname === "/";

  // A little celebration each time a new explorer goes into the Mission Log.
  const onStamp = useCallback(
    (id: string, field: "found" | "heard") => {
      const name = index?.artifacts.find((a) => a.id === id)?.name ?? "An explorer";
      setStamp(field === "heard" ? `★ Story heard: ${name}` : `📡 New stamp: ${name}`);
      window.setTimeout(() => setStamp(null), 2600);
    },
    [index],
  );
  useNewStamp(onStamp);

  return (
    <div className="shell">
      <Starfield lively={lively} />
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Mission Memory, home">
          <Logo />
        </Link>
        <Link to="/log" className={`log-chip${stamp ? " bump" : ""}`} aria-label={`Mission Log: ${log.found.length} explorers found`}>
          📡 <strong>{log.found.length}</strong>
          {index && <span>/{index.artifacts.length}</span>}
        </Link>
      </header>
      <main id="main">
        <Outlet />
      </main>
      {stamp && (
        <p className="toast" role="status">
          {stamp}
        </p>
      )}
      <footer className="footer">Built from NASA open data (NSSDCA and NASA mission pages). Not an official NASA site.</footer>
    </div>
  );
}
