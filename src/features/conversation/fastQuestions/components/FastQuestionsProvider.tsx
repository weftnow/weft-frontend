"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function createFastQuestionsQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        staleTime: 500,
      },
    },
  });
}

export function FastQuestionsProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createFastQuestionsQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
