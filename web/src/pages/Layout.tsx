import { Link, Outlet } from "react-router";
import Logo from "../components/Logo";

export default function Layout() {
  return (
    <div className="shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Mission Memory, home">
          <Logo />
        </Link>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer className="footer">
        Built from NASA open data (NSSDCA and NASA mission pages). Not an official NASA site.
      </footer>
    </div>
  );
}
