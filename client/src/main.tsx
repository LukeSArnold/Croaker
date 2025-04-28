import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { TrackProvider } from "./contexts/TrackContext";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <TrackProvider>
      <App />
    </TrackProvider>
  </BrowserRouter>
);
