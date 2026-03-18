import type { ReactNode } from "react";
import { SidebarProvider } from "../context/SidebarContext";
import { NotificationProvider } from "../context/NotificationContext";

interface AppProvidersProps {
  children: ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
  return (
    <SidebarProvider>
      <NotificationProvider>{children}</NotificationProvider>
    </SidebarProvider>
  );
}
