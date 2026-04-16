import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical } from "lucide-react";
import { instanceSettingsApi } from "@/api/instanceSettings";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { useTranslation } from "react-i18next";

export function InstanceExperimentalSettings() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setBreadcrumbs([
      { label: t("instanceSettings.title", "实例设置") },
      { label: t("instanceExperimentalSettings.experimental", "实验性") },
    ]);
  }, [setBreadcrumbs, t]);

  const experimentalQuery = useQuery({
    queryKey: queryKeys.instance.experimentalSettings,
    queryFn: () => instanceSettingsApi.getExperimental(),
  });

  const toggleMutation = useMutation({
    mutationFn: async (patch: { enableIsolatedWorkspaces?: boolean; autoRestartDevServerWhenIdle?: boolean }) =>
      instanceSettingsApi.updateExperimental(patch),
    onSuccess: async () => {
      setActionError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.instance.experimentalSettings }),
        queryClient.invalidateQueries({ queryKey: queryKeys.health }),
      ]);
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : t("instanceExperimentalSettings.failedToUpdate", "更新实验性设置失败。"));
    },
  });

  if (experimentalQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">{t("instanceExperimentalSettings.loading", "正在加载实验性设置...")}</div>;
  }

  if (experimentalQuery.error) {
    return (
      <div className="text-sm text-destructive">
        {experimentalQuery.error instanceof Error
          ? experimentalQuery.error.message
          : t("instanceExperimentalSettings.failedToLoad", "加载实验性设置失败。")}
      </div>
    );
  }

  const enableIsolatedWorkspaces = experimentalQuery.data?.enableIsolatedWorkspaces === true;
  const autoRestartDevServerWhenIdle = experimentalQuery.data?.autoRestartDevServerWhenIdle === true;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">{t("instanceExperimentalSettings.experimental", "实验性")}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("instanceExperimentalSettings.desc", "选择在成为默认行为之前仍在评估中的功能。")}
        </p>
      </div>

      {actionError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {actionError}
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">{t("instanceExperimentalSettings.isolatedWorkspaces", "启用隔离工作区")}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("instanceExperimentalSettings.isolatedWorkspacesDesc", "在项目配置中显示执行工作区控件，并允许新任务和现有任务运行使用隔离工作区行为。")}
            </p>
          </div>
          <ToggleSwitch
            checked={enableIsolatedWorkspaces}
            onCheckedChange={() => toggleMutation.mutate({ enableIsolatedWorkspaces: !enableIsolatedWorkspaces })}
            disabled={toggleMutation.isPending}
            aria-label={t("instanceExperimentalSettings.isolatedWorkspaces", "启用隔离工作区")}
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">{t("instanceExperimentalSettings.autoRestartDevServer", "空闲时自动重启开发服务器")}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("instanceExperimentalSettings.autoRestartDevServerDesc", "在 `pnpm dev:once` 中，等待所有排队和运行的本地智能体运行完成，然后在后端更改或迁移使当前启动过时时自动重启服务器。")}
            </p>
          </div>
          <ToggleSwitch
            checked={autoRestartDevServerWhenIdle}
            onCheckedChange={() => toggleMutation.mutate({ autoRestartDevServerWhenIdle: !autoRestartDevServerWhenIdle })}
            disabled={toggleMutation.isPending}
            aria-label={t("instanceExperimentalSettings.autoRestartDevServer", "空闲时自动重启开发服务器")}
          />
        </div>
      </section>
    </div>
  );
}
