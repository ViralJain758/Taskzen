import { BrowserRouter, Route, Routes } from "react-router-dom";
import Footer from "../components/Footer";
import MainLayout from "../layouts/MainLayout";
import Dashboard from "../pages/Dashboard";
import Landing from "../pages/Landing";
import Login from "../pages/Login";
import Privacy from "../pages/Privacy";
import ProjectPage from "../pages/ProjectPage";
import Register from "../pages/Register";
import Terms from "../pages/Terms";
import WorkspacePage from "../pages/WorkspacePage";
export default function AppRouter() {
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
