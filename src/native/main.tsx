import { createRoot } from "react-dom/client";
import { NativeApp } from "./app";
import "./styles.css";
import "./ui-v2/production.css";

createRoot(document.getElementById("root")!).render(<NativeApp />);
