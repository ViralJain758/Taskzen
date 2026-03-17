import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import WorkspacePage from "./pages/WorkspacePage.tsx";
import ProjectPage from "./pages/ProjectPage.tsx";
import MainLayout from "./layouts/MainLayout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <MainLayout>
              <Dashboard />
            </MainLayout>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
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
    </BrowserRouter>
  );
}

export default App;
