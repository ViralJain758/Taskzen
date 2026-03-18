import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { SidebarProvider } from "../context/SidebarContext";
import { NotificationProvider } from "../context/NotificationContext";
import { queryClient } from "../lib/queryClient";

interface AppProvidersProps {
  children: ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>
        <NotificationProvider>{children}</NotificationProvider>
      </SidebarProvider>
    </QueryClientProvider>
  );
}
