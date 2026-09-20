import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/app/App";
import "@/app/styles/global.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Tripic 앱을 표시할 루트 요소가 없습니다.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
