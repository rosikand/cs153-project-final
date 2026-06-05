import React from "react";
import ReactDOM from "react-dom/client";
import "leaflet/dist/leaflet.css";
import App from "./App.jsx";
import { ThemeProvider } from "./components/theme-provider.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="parallax-ui-theme">
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
