import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TABLES = ["orders", "return_records", "cash_moves", "products", "register_sessions"] as const;

/**
 * Keeps every cloud-backed query fresh: listens for row changes on the
 * operational tables and invalidates the "cloud" query family. Falls back to a
 * light poll so numbers still move if realtime is unavailable.
 */
export function useRealtimeRefresh(intervalMs = 20000) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: ["cloud"] });
    };

    const channel = supabase.channel("dashboard-live");
    for (const table of TABLES) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, invalidate);
    }
    channel.subscribe();

    const timer = window.setInterval(invalidate, intervalMs);
    const onFocus = () => invalidate();
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      void supabase.removeChannel(channel);
    };
  }, [queryClient, intervalMs]);
}
