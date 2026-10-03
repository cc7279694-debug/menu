import { createRoot } from "react-dom/client";
import { NativeApp } from "./app";
import "./styles.css";

createRoot(document.getElementById("root")!).render(<NativeApp />);
