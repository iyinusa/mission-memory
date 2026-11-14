import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import "./styles.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import Layout from "./pages/Layout";
import Home from "./pages/Home";
import World from "./pages/World";
import Ghost from "./pages/Ghost";
import Embed from "./pages/Embed";
import NotFound from "./pages/NotFound";
import PostcardPage from "./pages/PostcardPage";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/world/:worldId", element: <World /> },
      { path: "/ghost/:ghostId", element: <Ghost /> },
      { path: "/postcard/:ghostId", element: <PostcardPage /> },
      { path: "*", element: <NotFound /> },
    ],
  },
  // Chrome-less player, framed by MCP clients and other sites.
  { path: "/embed/:ghostId", element: <Embed /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
