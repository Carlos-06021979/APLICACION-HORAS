import React, { useState, useEffect } from "react";
import { AppProvider, useAppContext } from "./context/AppContext";
import Layout from "./components/layout/Layout";
import Dashboard from "./components/dashboard/Dashboard";
import HistoryView from "./components/history/HistoryView";
import PayrollComparator from "./components/comparator/PayrollComparator";
import SettingsView from "./components/settings/SettingsView";

const AppContent = () => {
  const [currentView, setCurrentView] = useState("dashboard");
  const { settings } = useAppContext();

  // Apply theme class to document element
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "dark") {
      root.classList.add("dark");
    } else if (settings.theme === "light") {
      root.classList.remove("dark");
    } else {
      // System preference
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  }, [settings.theme]);

  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return <Dashboard />;
      case "history":
        return <HistoryView />;
      case "comparator":
        return <PayrollComparator />;
      case "settings":
        return <SettingsView />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentView={currentView} setCurrentView={setCurrentView}>
      {renderView()}
    </Layout>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
