import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { MusicPlayerProvider } from "./contexts/MusicPlayerContext";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <MusicPlayerProvider>
      <App />
    </MusicPlayerProvider>
  </BrowserRouter>
);
