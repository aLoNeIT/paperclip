import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { PatchInstanceGeneralSettings, BackupRetentionPolicy } from "@paperclipai/shared";
import {
  DAILY_RETENTION_PRESETS,
  WEEKLY_RETENTION_PRESETS,
  MONTHLY_RETENTION_PRESETS,
  DEFAULT_BACKUP_RETENTION,
} from "@paperclipai/shared";
import { LogOut, SlidersHorizontal } from "lucide-react";
import { authApi } from "@/api/auth";
import { instanceSettingsApi } from "@/api/instanceSettings";
import { Button } from "../components/ui/button";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { cn } from "../lib/utils";

const FEEDBACK_TERMS_URL = import.meta.env.VITE_FEEDBACK_TERMS_URL?.trim() || "https://paperclip.ing/tos";

export function InstanceGeneralSettings() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [actionError, setActionError] = useState<string | null>(null);

  const signOutMutation = useMutation({
    mutationFn: () => authApi.signOut(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.session });
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : t("instanceGeneralSettings.failedToSignOut", "登出失败。"));
    },
  });

  useEffect(() => {
    setBreadcrumbs([
      { label: t("instanceSettings.title", "实例设置") },
      { label: t("instanceGeneralSettings.general", "通用") },
    ]);
  }, [setBreadcrumbs, t]);

  const generalQuery = useQuery({
    queryKey: queryKeys.instance.generalSettings,
    queryFn: () => instanceSettingsApi.getGeneral(),
  });

  const updateGeneralMutation = useMutation({
    mutationFn: instanceSettingsApi.updateGeneral,
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.instance.generalSettings });
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : t("instanceGeneralSettings.failedToUpdate", "更新通用设置失败。"));
    },
  });

  if (generalQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">{t("instanceGeneralSettings.loading", "正在加载通用设置...")}</div>;
  }

  if (generalQuery.error) {
    return (
      <div className="text-sm text-destructive">
        {generalQuery.error instanceof Error
          ? generalQuery.error.message
          : t("instanceGeneralSettings.failedToLoad", "加载通用设置失败。")}
      </div>
    );
  }

  const censorUsernameInLogs = generalQuery.data?.censorUsernameInLogs === true;
  const keyboardShortcuts = generalQuery.data?.keyboardShortcuts === true;
  const feedbackDataSharingPreference = generalQuery.data?.feedbackDataSharingPreference ?? "prompt";
  const backupRetention: BackupRetentionPolicy = generalQuery.data?.backupRetention ?? DEFAULT_BACKUP_RETENTION;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">{t("instanceGeneralSettings.general", "通用")}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("instanceGeneralSettings.desc", "配置影响操作员可见日志显示的实例级默认值。")}
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
            <h2 className="text-sm font-semibold">{t("instanceGeneralSettings.censorUsername", "在日志中隐藏用户名")}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("instanceGeneralSettings.censorUsernameDesc", "隐藏家目录路径和类似操作员可见日志输出中的用户名段。实时转录视图中路径外的独立用户名提及尚未被屏蔽。默认情况下此功能关闭。")}
            </p>
          </div>
          <ToggleSwitch
            checked={censorUsernameInLogs}
            onCheckedChange={() => updateGeneralMutation.mutate({ censorUsernameInLogs: !censorUsernameInLogs })}
            disabled={updateGeneralMutation.isPending}
            aria-label={t("instanceGeneralSettings.censorUsername", "在日志中隐藏用户名")}
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">{t("instanceGeneralSettings.keyboardShortcuts", "键盘快捷键")}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("instanceGeneralSettings.keyboardShortcutsDesc", "启用应用键盘快捷键，包括收件箱导航和创建任务或切换面板等全局快捷键。默认情况下此功能关闭。")}
            </p>
          </div>
          <ToggleSwitch
            checked={keyboardShortcuts}
            onCheckedChange={() => updateGeneralMutation.mutate({ keyboardShortcuts: !keyboardShortcuts })}
            disabled={updateGeneralMutation.isPending}
            aria-label={t("instanceGeneralSettings.keyboardShortcuts", "键盘快捷键")}
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="space-y-5">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">{t("instanceGeneralSettings.backupRetention", "备份保留")}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("instanceGeneralSettings.backupRetentionDesc", "配置每个层级保留自动数据库备份的时间。每日备份完整保留，然后精简为每周一份和每月一份。备份使用 gzip 压缩。")}
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("instanceGeneralSettings.daily", "每日")}</h3>
            <div className="flex flex-wrap gap-2">
              {DAILY_RETENTION_PRESETS.map((days) => {
                const active = backupRetention.dailyDays === days;
                return (
                  <button
                    key={days}
                    type="button"
                    disabled={updateGeneralMutation.isPending}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                      active
                        ? "border-foreground bg-accent text-foreground"
                        : "border-border bg-background hover:bg-accent/50",
                    )}
                    onClick={() =>
                      updateGeneralMutation.mutate({
                        backupRetention: { ...backupRetention, dailyDays: days },
                      })
                    }
                  >
                    <div className="text-sm font-medium">{days} {t("instanceGeneralSettings.days", "天")}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("instanceGeneralSettings.weekly", "每周")}</h3>
            <div className="flex flex-wrap gap-2">
              {WEEKLY_RETENTION_PRESETS.map((weeks) => {
                const active = backupRetention.weeklyWeeks === weeks;
                const label = weeks === 1 ? `1 ${t("instanceGeneralSettings.week", "周")}` : `${weeks} ${t("instanceGeneralSettings.weeks", "周")}`;
                return (
                  <button
                    key={weeks}
                    type="button"
                    disabled={updateGeneralMutation.isPending}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                      active
                        ? "border-foreground bg-accent text-foreground"
                        : "border-border bg-background hover:bg-accent/50",
                    )}
                    onClick={() =>
                      updateGeneralMutation.mutate({
                        backupRetention: { ...backupRetention, weeklyWeeks: weeks },
                      })
                    }
                  >
                    <div className="text-sm font-medium">{label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("instanceGeneralSettings.monthly", "每月")}</h3>
            <div className="flex flex-wrap gap-2">
              {MONTHLY_RETENTION_PRESETS.map((months) => {
                const active = backupRetention.monthlyMonths === months;
                const label = months === 1 ? `1 ${t("instanceGeneralSettings.month", "个月")}` : `${months} ${t("instanceGeneralSettings.months", "个月")}`;
                return (
                  <button
                    key={months}
                    type="button"
                    disabled={updateGeneralMutation.isPending}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                      active
                        ? "border-foreground bg-accent text-foreground"
                        : "border-border bg-background hover:bg-accent/50",
                    )}
                    onClick={() =>
                      updateGeneralMutation.mutate({
                        backupRetention: { ...backupRetention, monthlyMonths: months },
                      })
                    }
                  >
                    <div className="text-sm font-medium">{label}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">{t("instanceGeneralSettings.aiFeedbackSharing", "AI 反馈共享")}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("instanceGeneralSettings.aiFeedbackSharingDesc", "控制点赞和点踩投票是否可以将投票的 AI 输出发送到 Paperclip Labs。投票始终保存在本地。")}
            </p>
            {FEEDBACK_TERMS_URL ? (
              <a
                href={FEEDBACK_TERMS_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                {t("instanceGeneralSettings.readTermsOfService", "阅读我们的服务条款")}
              </a>
            ) : null}
          </div>
          {feedbackDataSharingPreference === "prompt" ? (
            <div className="rounded-lg border border-border/70 bg-accent/20 px-3 py-2 text-sm text-muted-foreground">
              {t("instanceGeneralSettings.noDefaultSaved", "尚未保存默认值。下一个点赞或点踩选择将询问一次，然后将答案保存在此处。")}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {[
              {
                value: "allowed",
                label: t("instanceGeneralSettings.alwaysAllow", "始终允许"),
                description: t("instanceGeneralSettings.alwaysAllowDesc", "自动共享投票的 AI 输出。"),
              },
              {
                value: "not_allowed",
                label: t("instanceGeneralSettings.dontAllow", "不允许"),
                description: t("instanceGeneralSettings.dontAllowDesc", "仅本地保存投票的 AI 输出。"),
              },
            ].map((option) => {
              const active = feedbackDataSharingPreference === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={updateGeneralMutation.isPending}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                    active
                      ? "border-foreground bg-accent text-foreground"
                      : "border-border bg-background hover:bg-accent/50",
                  )}
                  onClick={() =>
                    updateGeneralMutation.mutate({
                      feedbackDataSharingPreference: option.value as
                        | "allowed"
                        | "not_allowed",
                    })
                  }
                >
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {option.description}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("instanceGeneralSettings.retestPrompt", "要在本地开发中重新测试首次使用提示，请从此实例的")}
            <code>instance_settings.general</code> JSON {t("instanceGeneralSettings.jsonRow", "行")}
            {t("instanceGeneralSettings.removeKey", "中移除")} <code>feedbackDataSharingPreference</code> {t("instanceGeneralSettings.orSet", "键，或将其设置回")} <code>"prompt"</code>。{t("instanceGeneralSettings.unsetMeaning", "未设置和")} <code>"prompt"</code> {t("instanceGeneralSettings.bothMean", "都表示尚未选择默认值。")}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">{t("instanceGeneralSettings.signOut", "登出")}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {t("instanceGeneralSettings.signOutDesc", "从此 Paperclip 实例登出。您将被重定向到登录页面。")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={signOutMutation.isPending}
            onClick={() => signOutMutation.mutate()}
          >
            <LogOut className="size-4" />
            {signOutMutation.isPending ? t("instanceGeneralSettings.signingOut", "登出中...") : t("instanceGeneralSettings.signOut", "登出")}
          </Button>
        </div>
      </section>
    </div>
  );
}
