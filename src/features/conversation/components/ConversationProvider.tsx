"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function createConversationQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        staleTime: 500,
      },
    },
  });
}

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createConversationQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
