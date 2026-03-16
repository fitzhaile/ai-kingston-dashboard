import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

// Auto-discover every *.jsx file in this directory except main.jsx.
// Filename convention: My_Dashboard_Name.jsx
//   → URL slug:  /my-dashboard-name
//   → Nav label: My Dashboard Name
const modules = import.meta.glob("./*.jsx", { eager: true });

const DASHBOARDS = Object.entries(modules)
  .filter(([path]) => !path.endsWith("/main.jsx"))
  .map(([path, mod]) => {
    const filename = path.replace("./", "").replace(".jsx", "");
    const slug = filename.toLowerCase().replace(/_/g, "-");
    const name = filename.replace(/_/g, " ");
    return { path: slug, name, component: mod.default };
  })
  .filter((d) => d.component);

function getDashboard(pathname) {
  const slug = pathname.replace(/^\//, "").replace(/\/$/, "") || null;
  return DASHBOARDS.find((d) => d.path === slug) || null;
}

function App() {
  const pathname = window.location.pathname;
  const dashboard = getDashboard(pathname);

  if (!dashboard) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f8f9fb",
          fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
          padding: "48px 24px",
        }}
      >
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h1
            style={{
              margin: "0 0 8px",
              fontSize: 28,
              fontWeight: 800,
              color: "#1e293b",
              letterSpacing: "-0.03em",
            }}
          >
            Dashboards
          </h1>
          <p style={{ margin: "0 0 32px", color: "#64748b", fontSize: 15 }}>
            Select a dashboard to view.
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {DASHBOARDS.map((d) => (
              <li key={d.path} style={{ marginBottom: 12 }}>
                <a
                  href={`/${d.path}`}
                  style={{
                    display: "block",
                    padding: "16px 20px",
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    color: "#1e293b",
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: 15,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = "#d97706";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(217,119,6,0.15)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
                  }}
                >
                  {d.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const DashboardComponent = dashboard.component;
  return <DashboardComponent />;
}

const rootEl = document.getElementById("root");
const root = createRoot(rootEl);
root.render(<App />);

window.addEventListener("popstate", () => {
  root.render(<App />);
});
