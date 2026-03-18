import type { ReactNode } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />

      <div className="flex min-h-screen flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="fade-up flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-4 sm:py-5 md:px-8 md:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
