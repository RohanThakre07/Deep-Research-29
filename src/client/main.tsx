import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { LayoutDashboard, Upload, Package, Settings, Menu, X } from "lucide-react";
import "./index.css";

import Dashboard from "./pages/Dashboard";
import UploadPage from "./pages/Upload";
import Products from "./pages/Products";
import SettingsPage from "./pages/Settings";

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/upload", icon: Upload, label: "Upload" },
    { to: "/products", icon: Package, label: "Products" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-8">
                <h1 className="text-xl font-bold text-blue-600">
                  PRINTIFY<span className="text-gray-900">AUTO</span>
                </h1>
                
                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-1">
                  {navItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                      key={to}
                      to={to}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        }`
                      }
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </NavLink>
                  ))}
                </nav>
              </div>

              {/* Mobile menu button */}
              <button
                className="md:hidden p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>

          {/* Mobile Nav */}
          {mobileMenuOpen && (
            <nav className="md:hidden border-t border-gray-200 bg-white py-2 px-4">
              {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:bg-gray-100"
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </NavLink>
              ))}
            </nav>
          )}
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/products" element={<Products />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


