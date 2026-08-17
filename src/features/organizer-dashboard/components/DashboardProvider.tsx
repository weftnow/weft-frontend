"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * There is no app-wide QueryClientProvider — the existing one lives inside
 * ConversationProvider and is scoped to that feature. The dashboard gets its
 * own rather than hoisting one to the root layout, which would put a client
 * component around every server-rendered page in the app to serve one tab.
 */
function createDashboardQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // The room changes while the host watches it. A stale cache reading
        // "38 found their table" when it is really 44 is worse than a refetch.
        staleTime: 0,
        retry: 1,
        refetchOnWindowFocus: true,
      },
    },
  });
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  // useState, not a module constant: a client shared across sessions would
  // leak one organizer's cached room into the next render on a warm server.
  const [queryClient] = useState(createDashboardQueryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
