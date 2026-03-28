import { useQuery } from "@tanstack/react-query";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  type: "info" | "warning" | "success" | "maintenance";
  isActive: boolean;
  targetAll: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useGetActiveAnnouncements() {
  const base = (import.meta.env.BASE_URL as string).replace(/\/$/, "");
  return useQuery<Announcement[]>({
    queryKey: ["announcements", "active"],
    queryFn: async () => {
      const res = await fetch(`${base}/api/announcements/active`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}
