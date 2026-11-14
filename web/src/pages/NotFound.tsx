import { Link } from "react-router";

export default function NotFound() {
  return (
    <section>
      <h1>Signal lost</h1>
      <p>
        There is nothing at this address. <Link to="/">Back to mission control</Link>
      </p>
    </section>
  );
}
