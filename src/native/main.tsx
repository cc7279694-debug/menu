import { createRoot } from "react-dom/client";
import { NativeApp } from "./app";
import "./styles.css";
import "./ui-v2/production.css";
import "./ui-v2/g5-library.css";
import "./ui-v2/g5-intake.css";
import "./ui-v2/g5-cooking.css";
import "./ui-v2/g5-editor.css";

createRoot(document.getElementById("root")!).render(<NativeApp />);
