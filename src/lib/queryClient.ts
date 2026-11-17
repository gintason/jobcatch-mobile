import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api";

/** The app's single React Query client (shared so non-React code, like checkout, can refresh data). */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (n, e) => !(e instanceof ApiError && e.status >= 400 && e.status < 500) && n < 2,
    },
  },
});
