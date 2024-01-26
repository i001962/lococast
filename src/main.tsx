import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { Buffer } from 'buffer';

window.Buffer = Buffer;
console.log('Buffer polyfill applied', Buffer);

const root = document.getElementById("root");

if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
