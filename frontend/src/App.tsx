import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Landing from "./pages/Landing";
import WorkspacePage from "./pages/WorkspacePage.tsx";
import ProjectPage from "./pages/ProjectPage.tsx";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import MainLayout from "./layouts/MainLayout";
import Footer from "./components/Footer";

function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col">
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route
              path="/dashboard"
              element={
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              }
            />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route
              path="/workspace/:workspaceId"
              element={
                <MainLayout>
                  <WorkspacePage />
                </MainLayout>
              }
            />
            <Route
              path="/project/:projectId"
              element={
                <MainLayout>
                  <ProjectPage />
                </MainLayout>
              }
            />
          </Routes>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
