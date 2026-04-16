import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateTime } from "../lib/utils";
import { Identity } from "../components/Identity";
import { StatusBadge } from "../components/StatusBadge";
import { RunTranscriptView, type TranscriptDensity, type TranscriptMode } from "../components/transcript/RunTranscriptView";
import { runTranscriptFixtureEntries, runTranscriptFixtureMeta } from "../fixtures/runTranscriptFixtures";
import { ExternalLink, FlaskConical, LayoutPanelLeft, MonitorCog, PanelsTopLeft, RadioTower } from "lucide-react";

type SurfaceId = "detail" | "live" | "dashboard";

const surfaceOptions: Array<{
  id: SurfaceId;
  label: string;
  eyebrow: string;
  description: string;
  icon: typeof LayoutPanelLeft;
}> = [
  {
    id: "detail",
    label: "运行详情",
    eyebrow: "完整转录",
    description: "带有「精简 | 原始」切换的长格式运行页面，以及最可检查的转录视图。",
    icon: MonitorCog,
  },
  {
    id: "live",
    label: "任务小部件",
    eyebrow: "实时流",
    description: "任务详情实时运行小部件，优化为无需离开任务页面即可跟踪活动运行。",
    icon: RadioTower,
  },
  {
    id: "dashboard",
    label: "仪表盘卡片",
    eyebrow: "密集卡片",
    description: "活跃智能体仪表盘卡片，调整为紧凑扫描，同时保持相同的转录语言。",
    icon: PanelsTopLeft,
  },
];

function previewEntries(surface: SurfaceId) {
  if (surface === "dashboard") {
    return runTranscriptFixtureEntries.slice(-9);
  }
  if (surface === "live") {
    return runTranscriptFixtureEntries.slice(-14);
  }
  return runTranscriptFixtureEntries;
}

function RunDetailPreview({
  mode,
  streaming,
  density,
}: {
  mode: TranscriptMode;
  streaming: boolean;
  density: TranscriptDensity;
}) {
  const { t } = useTranslation();
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-background/80 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <div className="border-b border-border/60 bg-background/90 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="uppercase tracking-[0.18em] text-[10px]">
            {t("runTranscriptUxLab.runDetail", "运行详情")}
          </Badge>
          <StatusBadge status={streaming ? t("runTranscriptUxLab.running", "运行中") : t("runTranscriptUxLab.succeeded", "成功")} />
          <span className="text-xs text-muted-foreground">
            {formatDateTime(runTranscriptFixtureMeta.startedAt)}
          </span>
        </div>
        <div className="mt-2 text-sm font-medium">
          {t("runTranscriptUxLab.transcript", "转录")} ({runTranscriptFixtureEntries.length})
        </div>
      </div>
      <div className="max-h-[720px] overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(8,145,178,0.08),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.10),transparent_28%)] p-5">
        <RunTranscriptView
          entries={runTranscriptFixtureEntries}
          mode={mode}
          density={density}
          streaming={streaming}
        />
      </div>
    </div>
  );
}

function LiveWidgetPreview({
  streaming,
  mode,
  density,
}: {
  streaming: boolean;
  mode: TranscriptMode;
  density: TranscriptDensity;
}) {
  const { t } = useTranslation();
  return (
    <div className="overflow-hidden rounded-xl border border-cyan-500/25 bg-background/85 shadow-[0_20px_50px_rgba(6,182,212,0.10)]">
      <div className="border-b border-border/60 bg-cyan-500/[0.05] px-5 py-4">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">
          {t("runTranscriptUxLab.liveRuns", "实时运行")}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {t("runTranscriptUxLab.compactLiveTranscript", "任务详情页面的紧凑实时转录流。")}
        </div>
      </div>
      <div className="px-5 py-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Identity name={runTranscriptFixtureMeta.agentName} size="sm" />
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border/70 bg-background/70 px-2 py-1 font-mono">
                {runTranscriptFixtureMeta.sourceRunId.slice(0, 8)}
              </span>
              <StatusBadge status={streaming ? t("runTranscriptUxLab.running", "运行中") : t("runTranscriptUxLab.succeeded", "成功")} />
              <span>{formatDateTime(runTranscriptFixtureMeta.startedAt)}</span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">
            {t("runTranscriptUxLab.openRun", "打开运行")}
            <ExternalLink className="h-3 w-3" />
          </span>
        </div>
        <div className="max-h-[460px] overflow-y-auto pr-1">
          <RunTranscriptView
            entries={previewEntries("live")}
            mode={mode}
            density={density}
            limit={density === "compact" ? 10 : 12}
            streaming={streaming}
          />
        </div>
      </div>
    </div>
  );
}

function DashboardPreview({
  streaming,
  mode,
  density,
}: {
  streaming: boolean;
  mode: TranscriptMode;
  density: TranscriptDensity;
}) {
  const { t } = useTranslation();
  return (
    <div className="max-w-md">
      <div className={cn(
        "flex h-[320px] flex-col overflow-hidden rounded-xl border shadow-[0_20px_40px_rgba(15,23,42,0.10)]",
        streaming
          ? "border-cyan-500/25 bg-cyan-500/[0.04]"
          : "border-border bg-background/75",
      )}>
        <div className="border-b border-border/60 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "inline-flex h-2.5 w-2.5 rounded-full",
                  streaming ? "bg-cyan-500 shadow-[0_0_0_6px_rgba(34,211,238,0.12)]" : "bg-muted-foreground/35",
                )} />
                <Identity name={runTranscriptFixtureMeta.agentName} size="sm" />
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                {streaming ? t("runTranscriptUxLab.liveNow", "实时") : t("runTranscriptUxLab.finished2mAgo", "2 分钟前完成")}
              </div>
            </div>
            <span className="rounded-full border border-border/70 bg-background/70 px-2 py-1 text-[10px] text-muted-foreground">
              <ExternalLink className="h-2.5 w-2.5" />
            </span>
          </div>
          <div className="mt-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-xs text-cyan-700 dark:text-cyan-300">
            {runTranscriptFixtureMeta.issueIdentifier} - {runTranscriptFixtureMeta.issueTitle}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <RunTranscriptView
            entries={previewEntries("dashboard")}
            mode={mode}
            density={density}
            limit={density === "compact" ? 6 : 8}
            streaming={streaming}
          />
        </div>
      </div>
    </div>
  );
}

export function RunTranscriptUxLab() {
  const { t } = useTranslation();
  const [selectedSurface, setSelectedSurface] = useState<SurfaceId>("detail");
  const [detailMode, setDetailMode] = useState<TranscriptMode>("nice");
  const [streaming, setStreaming] = useState(true);
  const [density, setDensity] = useState<TranscriptDensity>("comfortable");

  const selected = surfaceOptions.find((option) => option.id === selectedSurface) ?? surfaceOptions[0];

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-[linear-gradient(135deg,rgba(8,145,178,0.08),transparent_28%),linear-gradient(180deg,rgba(245,158,11,0.08),transparent_40%),var(--background)] shadow-[0_28px_70px_rgba(15,23,42,0.10)]">
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="border-b border-border/60 bg-background/75 p-5 lg:border-b-0 lg:border-r">
            <div className="mb-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-700 dark:text-cyan-300">
                <FlaskConical className="h-3.5 w-3.5" />
                {t("runTranscriptUxLab.uxLab", "UX 实验室")}
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight">{t("runTranscriptUxLab.title", "运行转录 Fixture")}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("runTranscriptUxLab.description", "构建自真实的 Paperclip 开发运行，然后清理以确保无秘密、本地路径或环境细节进入 fixture。")}
              </p>
            </div>

            <div className="space-y-2">
              {surfaceOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedSurface(option.id)}
                    className={cn(
                      "w-full rounded-xl border px-4 py-3 text-left transition-all",
                      selectedSurface === option.id
                        ? "border-cyan-500/35 bg-cyan-500/[0.10] shadow-[0_12px_24px_rgba(6,182,212,0.12)]"
                        : "border-border/70 bg-background/70 hover:border-cyan-500/20 hover:bg-cyan-500/[0.04]",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="rounded-lg border border-current/15 p-2 text-cyan-700 dark:text-cyan-300">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {option.eyebrow}
                        </span>
                        <span className="mt-1 block text-sm font-medium">{option.label}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="min-w-0 p-5">
            <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {selected.eyebrow}
                </div>
                <h2 className="mt-1 text-2xl font-semibold">{selected.label}</h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  {selected.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em]">
                  {t("runTranscriptUxLab.sourceRun", "源运行")} {runTranscriptFixtureMeta.sourceRunId.slice(0, 8)}
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em]">
                  {runTranscriptFixtureMeta.issueIdentifier}
                </Badge>
              </div>
            </div>

            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t("runTranscriptUxLab.controls", "控制")}
              </span>
              <div className="inline-flex rounded-full border border-border/70 bg-background/80 p-1">
                {(["nice", "raw"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                      detailMode === mode ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => setDetailMode(mode)}
                  >
                    {mode === "nice" ? t("runTranscriptUxLab.nice", "精简") : t("runTranscriptUxLab.raw", "原始")}
                  </button>
                ))}
              </div>
              <div className="inline-flex rounded-full border border-border/70 bg-background/80 p-1">
                {(["comfortable", "compact"] as const).map((nextDensity) => (
                  <button
                    key={nextDensity}
                    type="button"
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                      density === nextDensity ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => setDensity(nextDensity)}
                  >
                    {nextDensity === "comfortable" ? t("runTranscriptUxLab.comfortable", "舒适") : t("runTranscriptUxLab.compact", "紧凑")}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setStreaming((value) => !value)}
              >
                {streaming ? t("runTranscriptUxLab.showSettled", "显示已处理状态") : t("runTranscriptUxLab.showStreaming", "显示流式状态")}
              </Button>
            </div>

            {selectedSurface === "detail" ? (
              <div className={cn(density === "compact" && "max-w-5xl")}>
                <RunDetailPreview mode={detailMode} streaming={streaming} density={density} />
              </div>
            ) : selectedSurface === "live" ? (
              <div className={cn(density === "compact" && "max-w-4xl")}>
                <LiveWidgetPreview streaming={streaming} mode={detailMode} density={density} />
              </div>
            ) : (
              <DashboardPreview streaming={streaming} mode={detailMode} density={density} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}