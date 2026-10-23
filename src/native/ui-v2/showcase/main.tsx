import { createRoot } from "react-dom/client";
import { UiV2Showcase, type ShowcaseScreen } from "./showcase";
import type { DemoScenario } from "./demo-data";
import "../tokens.css";
import "./styles.css";
import "./components-page.css";

if (!import.meta.env.DEV || !location.pathname.startsWith("/ui-v2-showcase/")) {
  throw new Error("The G1 showcase is available only at its isolated development entry.");
}
const query = new URLSearchParams(location.search);
const screens: ShowcaseScreen[] = ["home", "library", "detail", "cooking", "components", "settings"];
const scenarios: DemoScenario[] = ["default", "no-image", "title-only", "long", "empty", "broken-image"];
const requestedScreen = query.get("screen");
const requestedScenario = query.get("scenario");
createRoot(document.getElementById("root")!).render(<UiV2Showcase
  initialScreen={screens.find((s) => s === requestedScreen) ?? "home"}
  initialScenario={scenarios.find((s) => s === requestedScenario) ?? "default"}
  initialMode={query.get("mode") === "focus" ? "focus" : "guided"}
  initialTheme={query.get("theme")}
/>);
