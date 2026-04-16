import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IssueChatThread } from "../components/IssueChatThread";
import {
  issueChatUxAgentMap,
  issueChatUxFeedbackVotes,
  issueChatUxLinkedRuns,
  issueChatUxLiveComments,
  issueChatUxLiveEvents,
  issueChatUxLiveRuns,
  issueChatUxMentions,
  issueChatUxReassignOptions,
  issueChatUxReviewComments,
  issueChatUxReviewEvents,
  issueChatUxSubmittingComments,
  issueChatUxTranscriptsByRunId,
} from "../fixtures/issueChatUxFixtures";
import { cn } from "../lib/utils";
import { Bot, Brain, FlaskConical, Loader2, MessagesSquare, Route, Sparkles, WandSparkles } from "lucide-react";

const noop = async () => {};

function LabSection({
  id,
  eyebrow,
  title,
  description,
  accentClassName,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
  accentClassName?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-[28px] border border-border/70 bg-background/80 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-5",
        accentClassName,
      )}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {eyebrow}
          </div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

const DEMO_REASONING_LINES = [
  "Analyzing the user's request about the animation smoothness...",
  "The current implementation unmounts the old span instantly, causing a flash...",
  "Looking at the CSS keyframes for cot-line-slide-up...",
  "We need a paired exit animation so the old line slides out while the new one slides in...",
  "Implementing a two-span ticker: exiting line goes up and out, entering line comes up from below...",
  "Testing the 280ms cubic-bezier transition timing...",
];

function RotatingReasoningDemo({ intervalMs = 2200 }: { intervalMs?: number }) {
  const [index, setIndex] = useState(0);
  const prevRef = useRef(DEMO_REASONING_LINES[0]);
  const [ticker, setTicker] = useState<{
    key: number;
    current: string;
    exiting: string | null;
  }>({ key: 0, current: DEMO_REASONING_LINES[0], exiting: null });

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % DEMO_REASONING_LINES.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  const currentLine = DEMO_REASONING_LINES[index];

  useEffect(() => {
    if (currentLine !== prevRef.current) {
      const prev = prevRef.current;
      prevRef.current = currentLine;
      setTicker((t) => ({ key: t.key + 1, current: currentLine, exiting: prev }));
    }
  }, [currentLine]);

  return (
    <div className="flex gap-2 px-1">
      <div className="flex flex-col items-center pt-0.5">
        <Brain className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
      </div>
      <div className="relative h-5 min-w-0 flex-1 overflow-hidden">
        {ticker.exiting !== null && (
          <span
            key={`out-${ticker.key}`}
            className="cot-line-exit absolute inset-x-0 truncate text-[13px] italic leading-5 text-muted-foreground/70"
            onAnimationEnd={() => setTicker((t) => ({ ...t, exiting: null }))}
          >
            {ticker.exiting}
          </span>
        )}
        <span
          key={`in-${ticker.key}`}
          className={cn(
            "absolute inset-x-0 truncate text-[13px] italic leading-5 text-muted-foreground/70",
            ticker.key > 0 && "cot-line-enter",
          )}
        >
          {ticker.current}
        </span>
      </div>
    </div>
  );
}

export function IssueChatUxLab() {
  const { t } = useTranslation();
  const [showComposer, setShowComposer] = useState(true);

  const highlights = [
    t("issueChatUxLab.highlights.1", "运行中的助手回复，包含流式文本、推理、工具卡片和后台状态说明"),
    t("issueChatUxLab.highlights.2", "历史任务事件和关联运行内联渲染在聊天时间线中"),
    t("issueChatUxLab.highlights.3", "排队的用户消息、已处理的助手评论和反馈控制"),
    t("issueChatUxLab.highlights.4", "提交中（待处理）消息气泡，显示「发送中...」标签和降低的不透明度"),
    t("issueChatUxLab.highlights.5", "空状态和禁用编写器状态，无需依赖实时后端数据"),
  ];

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[32px] border border-border/70 bg-[linear-gradient(135deg,rgba(8,145,178,0.10),transparent_28%),linear-gradient(180deg,rgba(245,158,11,0.10),transparent_44%),var(--background)] shadow-[0_30px_80px_rgba(15,23,42,0.10)]">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_320px]">
          <div className="p-6 sm:p-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-700 dark:text-cyan-300">
              <FlaskConical className="h-3.5 w-3.5" />
              {t("issueChatUxLab.badge", "聊天 UX 实验室")}
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">{t("issueChatUxLab.title", "任务聊天审查界面")}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              {t("issueChatUxLab.description", "此页面使用 fixture 支持的消息来练习真实的 assistant-ui 任务聊天。使用它来审查间距、时间顺序、运行状态、工具渲染、活动行、队列和编写器行为，而无需正在进行中的实时任务。")}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em]">
                /tests/ux/chat
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em]">
                {t("issueChatUxLab.badges.assistantUi", "assistant-ui 线程")}
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em]">
                {t("issueChatUxLab.badges.fixtureBacked", "fixture 支持的实时运行")}
              </Badge>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => setShowComposer((value) => !value)}>
                {showComposer ? t("issueChatUxLab.hideComposer", "隐藏主预览中的编写器") : t("issueChatUxLab.showComposer", "显示主预览中的编写器")}
              </Button>
              <a
                href="#live-execution"
                className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <Route className="h-3.5 w-3.5" />
                {t("issueChatUxLab.jumpToLive", "跳转到实时执行预览")}
              </a>
            </div>
          </div>

          <aside className="border-t border-border/60 bg-background/70 p-6 lg:border-l lg:border-t-0">
            <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <WandSparkles className="h-4 w-4 text-cyan-700 dark:text-cyan-300" />
              {t("issueChatUxLab.coveredStates", "涵盖的状态")}
            </div>
            <div className="space-y-3">
              {highlights.map((highlight, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-border/70 bg-background/85 px-4 py-3 text-sm text-muted-foreground"
                >
                  {highlight}
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>

      <LabSection
        id="rotating-text"
        eyebrow={t("issueChatUxLab.animationDemo", "动画演示")}
        title={t("issueChatUxLab.rotatingReasoning", "旋转推理文本")}
        description={t("issueChatUxLab.rotatingReasoningDesc", "隔离的计时器循环示例推理行。输出行向上滑动并淡出，而输入行从下方滑动上来。循环运行，因此您可以调整时序和缓动，而无需实时流。")}
        accentClassName="bg-[linear-gradient(180deg,rgba(168,85,247,0.06),transparent_28%),var(--background)]"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-accent/10 p-4">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t("issueChatUxLab.defaultInterval", "默认间隔 (2.2 秒)")}
            </div>
            <RotatingReasoningDemo />
          </div>
          <div className="rounded-xl border border-border/60 bg-accent/10 p-4">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t("issueChatUxLab.fastInterval", "快速间隔 (1 秒) — 压力测试")}
            </div>
            <RotatingReasoningDemo intervalMs={1000} />
          </div>
        </div>
      </LabSection>

      <LabSection
        id="working-tokens"
        eyebrow={t("issueChatUxLab.statusTokens", "状态标记")}
        title={t("issueChatUxLab.workingWorked", "正在工作/已完成头部动词")}
        description={t("issueChatUxLab.workingWorkedDesc", "「正在工作」标记使用 shimmer-text 渐变扫描来表示活动运行。运行完成后，它变为静态的「已完成」标记。")}
        accentClassName="bg-[linear-gradient(180deg,rgba(16,185,129,0.06),transparent_28%),var(--background)]"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-accent/10 p-4">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t("issueChatUxLab.activeRunShimmer", "活动运行 — 闪烁")}
            </div>
            <div className="flex items-center gap-2.5 rounded-lg px-1 py-2">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground/80">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                <span className="shimmer-text">{t("issueChatUxLab.working", "正在工作")}</span>
              </span>
              <span className="text-xs text-muted-foreground/60">{t("issueChatUxLab.for12s", "持续 12 秒")}</span>
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-accent/10 p-4">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t("issueChatUxLab.completedRunStatic", "已完成运行 — 静态")}
            </div>
            <div className="flex items-center gap-2.5 rounded-lg px-1 py-2">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground/80">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/70" />
                </span>
                {t("issueChatUxLab.worked", "已完成")}
              </span>
              <span className="text-xs text-muted-foreground/60">{t("issueChatUxLab.for1m24s", "持续 1 分 24 秒")}</span>
            </div>
          </div>
        </div>
      </LabSection>

      <LabSection
        id="live-execution"
        eyebrow={t("issueChatUxLab.primaryPreview", "主预览")}
        title={t("issueChatUxLab.liveExecution", "实时执行线程")}
        description={t("issueChatUxLab.liveExecutionDesc", "显示完全活动状态：时间线事件、历史运行标记、带有推理和工具的运行中助手回复，以及来自用户的排队后续。")}
        accentClassName="bg-[linear-gradient(180deg,rgba(6,182,212,0.05),transparent_28%),var(--background)]"
      >
        <IssueChatThread
          comments={issueChatUxLiveComments}
          linkedRuns={issueChatUxLinkedRuns.slice(0, 1)}
          timelineEvents={issueChatUxLiveEvents}
          liveRuns={issueChatUxLiveRuns}
          issueStatus="todo"
          agentMap={issueChatUxAgentMap}
          currentUserId="user-1"
          onAdd={noop}
          onVote={noop}
          onCancelRun={noop}
          onInterruptQueued={noop}
          draftKey="issue-chat-ux-lab-primary"
          enableReassign
          reassignOptions={issueChatUxReassignOptions}
          currentAssigneeValue="agent:agent-1"
          suggestedAssigneeValue="agent:agent-2"
          mentions={issueChatUxMentions}
          showComposer={showComposer}
          enableLiveTranscriptPolling={false}
          transcriptsByRunId={issueChatUxTranscriptsByRunId}
          hasOutputForRun={(runId) => issueChatUxTranscriptsByRunId.has(runId)}
        />
      </LabSection>

      <LabSection
        eyebrow={t("issueChatUxLab.submittingState", "提交状态")}
        title={t("issueChatUxLab.pendingMessage", "待处理消息气泡")}
        description={t("issueChatUxLab.pendingMessageDesc", "当用户发送消息时，气泡会短暂显示「发送中...」标签并降低不透明度，直到服务器确认接收。此预览呈现该瞬态状态。")}
        accentClassName="bg-[linear-gradient(180deg,rgba(59,130,246,0.06),transparent_28%),var(--background)]"
      >
        <IssueChatThread
          comments={issueChatUxSubmittingComments}
          linkedRuns={[]}
          timelineEvents={[]}
          issueStatus="in_progress"
          agentMap={issueChatUxAgentMap}
          currentUserId="user-1"
          onAdd={noop}
          draftKey="issue-chat-ux-lab-submitting"
          showComposer={false}
          enableLiveTranscriptPolling={false}
        />
      </LabSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <LabSection
          eyebrow={t("issueChatUxLab.settledReview", "已处理审查")}
          title={t("issueChatUxLab.durableComments", "持久化评论和反馈")}
          description={t("issueChatUxLab.durableCommentsDesc", "显示运行后状态：助手评论反馈控制、历史运行上下文和时间线重新分配，无任何活动流。")}
          accentClassName="bg-[linear-gradient(180deg,rgba(168,85,247,0.05),transparent_26%),var(--background)]"
        >
          <IssueChatThread
            comments={issueChatUxReviewComments}
            linkedRuns={issueChatUxLinkedRuns.slice(1)}
            timelineEvents={issueChatUxReviewEvents}
            feedbackVotes={issueChatUxFeedbackVotes}
            feedbackTermsUrl="/feedback-terms"
            issueStatus="in_review"
            agentMap={issueChatUxAgentMap}
            currentUserId="user-1"
            onAdd={noop}
            onVote={noop}
            draftKey="issue-chat-ux-lab-review"
            showComposer={false}
            enableLiveTranscriptPolling={false}
          />
        </LabSection>

        <div className="space-y-6">
          <LabSection
            eyebrow={t("issueChatUxLab.emptyThread", "空线程")}
            title={t("issueChatUxLab.emptyState", "空状态和禁用编写器")}
            description={t("issueChatUxLab.emptyStateDesc", "即使没有线程也保持消息区域可见，并在回复被阻止时用明确警告替换编写器。")}
            accentClassName="bg-[linear-gradient(180deg,rgba(245,158,11,0.08),transparent_26%),var(--background)]"
          >
            <IssueChatThread
              comments={[]}
              linkedRuns={[]}
              timelineEvents={[]}
              issueStatus="done"
              agentMap={issueChatUxAgentMap}
              currentUserId="user-1"
              onAdd={noop}
              composerDisabledReason={t("issueChatUxLab.composerDisabled", "此工作区已关闭，因此在任务重新打开之前禁用新的聊天回复。")}
              draftKey="issue-chat-ux-lab-empty"
              enableLiveTranscriptPolling={false}
            />
          </LabSection>

          <Card className="gap-4 border-border/70 bg-background/85 py-0">
            <CardHeader className="px-5 pt-5 pb-0">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <MessagesSquare className="h-4 w-4 text-cyan-700 dark:text-cyan-300" />
                {t("issueChatUxLab.reviewChecklist", "审查清单")}
              </div>
              <CardTitle className="text-lg">{t("issueChatUxLab.whatToEvaluate", "在此页面上评估什么")}</CardTitle>
              <CardDescription>
                {t("issueChatUxLab.whatToEvaluateDesc", "此路由应该是在调整之前或之后检查聊天系统的最快方式。")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-5 pb-5 pt-0 text-sm text-muted-foreground">
              <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
                <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                  <Bot className="h-4 w-4 text-cyan-700 dark:text-cyan-300" />
                  {t("issueChatUxLab.messageHierarchy", "消息层次结构")}
                </div>
                {t("issueChatUxLab.messageHierarchyDesc", "检查用户、助手和系统行的扫描方式不同，但不会感觉像单独的产品。")}
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
                <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                  <Sparkles className="h-4 w-4 text-cyan-700 dark:text-cyan-300" />
                  {t("issueChatUxLab.streamPolish", "流式优化")}
                </div>
                {t("issueChatUxLab.streamPolishDesc", "观看实时预览以了解推理密度、工具扩展行为和排队后续的可读性。")}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
