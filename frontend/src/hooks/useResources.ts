import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import type { Analysis, Filters, ResourceKey } from "../types";

export const useResources = (kind: ResourceKey, filters: Filters = {}) =>
  useQuery({
    queryKey: [kind, "list", filters],
    queryFn: ({ signal }) => api.list(kind, filters, signal),
  });
export const useAllResources = (
  kind: ResourceKey,
  filters: Filters = {},
  enabled = true,
) =>
  useQuery({
    queryKey: [kind, "all", filters],
    queryFn: ({ signal }) => api.all(kind, filters, signal),
    enabled,
  });
export const useResource = (kind: ResourceKey, id: number) =>
  useQuery({
    queryKey: [kind, id],
    queryFn: ({ signal }) => api.get(kind, id, signal),
    enabled: Number.isInteger(id) && id > 0,
  });
export const useDashboard = () =>
  useQuery({
    queryKey: ["dashboard"],
    queryFn: ({ signal }) => api.dashboard(signal),
  });

export function useResourceMutations(kind: ResourceKey) {
  const client = useQueryClient();
  const refresh = async () => {
    await Promise.all(
      [kind, "campanas", "dashboard", "latest-analysis", "analysis"]
        .filter((key, index, array) => array.indexOf(key) === index)
        .map((key) => client.invalidateQueries({ queryKey: [key] })),
    );
  };
  return {
    save: useMutation({
      mutationFn: ({
        body,
        id,
      }: {
        body: Record<string, unknown>;
        id?: number;
      }) => api.save(kind, body, id),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (id: number) => api.remove(kind, id),
      onSuccess: refresh,
    }),
  };
}

export function useCampaignAnalysis(campaignId: number) {
  const client = useQueryClient();
  const latest = useQuery({
    queryKey: ["latest-analysis", campaignId],
    queryFn: ({ signal }) => api.latestAnalysis(campaignId, signal),
  });
  const id = latest.data?.id;
  const result = useQuery({
    queryKey: ["analysis", id],
    queryFn: ({ signal }) => api.analysis(id!, signal),
    enabled: Boolean(id),
    refetchInterval: (query) =>
      ["pendiente", "procesando"].includes(query.state.data?.estado || "")
        ? 1500
        : false,
  });
  const start = useMutation({
    mutationFn: () => api.analyze(campaignId),
    onSuccess: (analysis: Analysis) => {
      client.setQueryData(["latest-analysis", campaignId], analysis);
      client.setQueryData(["analysis", analysis.id], analysis);
    },
  });
  return {
    analysis: result.data || latest.data,
    loading: latest.isPending,
    error: start.error || result.error || latest.error,
    start,
  };
}
