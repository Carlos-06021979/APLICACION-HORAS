import React from "react";
import { Home, History, Settings } from "lucide-react";

const Layout = ({ children, currentView, setCurrentView }) => {
  return (
    <div className="layout-container">
      <header className="app-header">
        <h1>Control de Horas</h1>
      </header>

      <main className="app-main">{children}</main>

      <nav className="bottom-nav">
        <button
          className={`nav-btn ${currentView === "dashboard" ? "active" : ""}`}
          onClick={() => setCurrentView("dashboard")}
        >
          <Home size={24} />
          <span>Fichar</span>
        </button>
        <button
          className={`nav-btn ${currentView === "history" ? "active" : ""}`}
          onClick={() => setCurrentView("history")}
        >
          <History size={24} />
          <span>Historial</span>
        </button>
        <button
          className={`nav-btn ${currentView === "settings" ? "active" : ""}`}
          onClick={() => setCurrentView("settings")}
        >
          <Settings size={24} />
          <span>Ajustes</span>
        </button>
      </nav>
    </div>
  );
};

export default Layout;
