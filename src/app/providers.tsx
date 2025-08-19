"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TimerProvider } from "@/contexts/timer-context";

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <TimerProvider>
        {children}
      </TimerProvider>
    </QueryClientProvider>
  );
}
