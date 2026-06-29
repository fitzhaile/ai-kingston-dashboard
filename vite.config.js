import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: './',                       // relative asset paths — works at domain root OR any subfolder
  plugins: [tailwindcss(), react()],
  root: ".",
});
