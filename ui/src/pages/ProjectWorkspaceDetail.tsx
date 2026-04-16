import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "@/lib/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isUuidLike, type ProjectWorkspace } from "@paperclipai/shared";
import { ArrowLeft, Check, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChoosePathButton } from "../components/PathInstructionsModal";
import { projectsApi } from "../api/projects";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";
import { queryKeys } from "../lib/queryKeys";
import { projectRouteRef, projectWorkspaceUrl } from "../lib/utils";

type WorkspaceFormState = {
  name: string;
  sourceType: ProjectWorkspaceSourceType;
  cwd: string;
  repoUrl: string;
  repoRef: string;
  defaultRef: string;
  visibility: ProjectWorkspaceVisibility;
  setupCommand: string;
  cleanupCommand: string;
  remoteProvider: string;
  remoteWorkspaceRef: string;
  sharedWorkspaceKey: string;
  runtimeConfig: string;
};

type ProjectWorkspaceSourceType = ProjectWorkspace["sourceType"];
type ProjectWorkspaceVisibility = ProjectWorkspace["visibility"];

const SOURCE_TYPE_OPTIONS: Array<{ value: ProjectWorkspaceSourceType; label: string; description: string }> = [
  { value: "local_path", label: "本地 git 检出", description: "Paperclip 可以直接使用的本地路径。" },
  { value: "non_git_path", label: "本地非 git 路径", description: "没有 git 语义的本地文件夹。" },
  { value: "git_repo", label: "远程 git 仓库", description: "带有可选引用和本地检出的仓库 URL。" },
  { value: "remote_managed", label: "远程管理工作区", description: "通过外部引用跟踪的托管工作区。" },
];

const VISIBILITY_OPTIONS: Array<{ value: ProjectWorkspaceVisibility; label: string }> = [
  { value: "default", label: "默认" },
  { value: "advanced", label: "高级" },
];

function isSafeExternalUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isAbsolutePath(value: string) {
  return value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value);
}

function readText(value: string | null | undefined) {
  return value ?? "";
}

function hasActiveRuntimeServices(workspace: ProjectWorkspace | null | undefined) {
  return (workspace?.runtimeServices ?? []).some((service) => service.status === "starting" || service.status === "running");
}

function formatJson(value: Record<string, unknown> | null | undefined) {
  if (!value || Object.keys(value).length === 0) return "";
  return JSON.stringify(value, null, 2);
}

function formStateFromWorkspace(workspace: ProjectWorkspace): WorkspaceFormState {
  return {
    name: workspace.name,
    sourceType: workspace.sourceType,
    cwd: readText(workspace.cwd),
    repoUrl: readText(workspace.repoUrl),
    repoRef: readText(workspace.repoRef),
    defaultRef: readText(workspace.defaultRef),
    visibility: workspace.visibility,
    setupCommand: readText(workspace.setupCommand),
    cleanupCommand: readText(workspace.cleanupCommand),
    remoteProvider: readText(workspace.remoteProvider),
    remoteWorkspaceRef: readText(workspace.remoteWorkspaceRef),
    sharedWorkspaceKey: readText(workspace.sharedWorkspaceKey),
    runtimeConfig: formatJson(workspace.runtimeConfig?.workspaceRuntime),
  };
}

function normalizeText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseRuntimeConfigJson(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true as const, value: null as Record<string, unknown> | null };

  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        ok: false as const,
        error: "运行服务 JSON 必须是 JSON 对象。",
      };
    }
    return { ok: true as const, value: parsed as Record<string, unknown> };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "无效的 JSON。",
    };
  }
}

function buildWorkspacePatch(initialState: WorkspaceFormState, nextState: WorkspaceFormState) {
  const patch: Record<string, unknown> = {};
  const maybeAssign = (key: keyof WorkspaceFormState, transform?: (value: string) => unknown) => {
    const initialValue = initialState[key];
    const nextValue = nextState[key];
    if (initialValue === nextValue) return;
    patch[key] = transform ? transform(nextValue) : nextValue;
  };

  maybeAssign("name", normalizeText);
  maybeAssign("sourceType");
  maybeAssign("cwd", normalizeText);
  maybeAssign("repoUrl", normalizeText);
  maybeAssign("repoRef", normalizeText);
  maybeAssign("defaultRef", normalizeText);
  maybeAssign("visibility");
  maybeAssign("setupCommand", normalizeText);
  maybeAssign("cleanupCommand", normalizeText);
  maybeAssign("remoteProvider", normalizeText);
  maybeAssign("remoteWorkspaceRef", normalizeText);
  maybeAssign("sharedWorkspaceKey", normalizeText);
  if (initialState.runtimeConfig !== nextState.runtimeConfig) {
    const parsed = parseRuntimeConfigJson(nextState.runtimeConfig);
    if (!parsed.ok) throw new Error(parsed.error);
    patch.runtimeConfig = {
      workspaceRuntime: parsed.value,
    };
  }

  return patch;
}

function validateWorkspaceForm(form: WorkspaceFormState) {
  const cwd = normalizeText(form.cwd);
  const repoUrl = normalizeText(form.repoUrl);
  const remoteWorkspaceRef = normalizeText(form.remoteWorkspaceRef);

  if (form.sourceType === "remote_managed") {
    if (!remoteWorkspaceRef && !repoUrl) {
      return "远程管理工作区需要远程工作区引用或仓库 URL。";
    }
  } else if (!cwd && !repoUrl) {
    return "工作区需要至少一个本地路径或仓库 URL。";
  }

  if (cwd && (form.sourceType === "local_path" || form.sourceType === "non_git_path") && !isAbsolutePath(cwd)) {
    return "本地工作区路径必须是绝对路径。";
  }

  if (repoUrl) {
    try {
      new URL(repoUrl);
    } catch {
      return "仓库 URL 必须是有效的 URL。";
    }
  }

  const runtimeConfig = parseRuntimeConfigJson(form.runtimeConfig);
  if (!runtimeConfig.ok) {
    return runtimeConfig.error;
  }

  return null;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
        {hint ? <span className="text-[11px] leading-relaxed text-muted-foreground sm:text-right">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 py-1.5 sm:flex-row sm:items-start sm:gap-3">
      <div className="shrink-0 text-xs text-muted-foreground sm:w-28">{label}</div>
      <div className="min-w-0 flex-1 text-sm">{children}</div>
    </div>
  );
}

export function ProjectWorkspaceDetail() {
  const { t } = useTranslation();
  const { companyPrefix, projectId, workspaceId } = useParams<{
    companyPrefix?: string;
    projectId: string;
    workspaceId: string;
  }>();
  const { companies, selectedCompanyId, setSelectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<WorkspaceFormState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [runtimeActionMessage, setRuntimeActionMessage] = useState<string | null>(null);
  const routeProjectRef = projectId ?? "";
  const routeWorkspaceId = workspaceId ?? "";

  const routeCompanyId = useMemo(() => {
    if (!companyPrefix) return null;
    const requestedPrefix = companyPrefix.toUpperCase();
    return companies.find((company) => company.issuePrefix.toUpperCase() === requestedPrefix)?.id ?? null;
  }, [companies, companyPrefix]);

  const lookupCompanyId = routeCompanyId ?? selectedCompanyId ?? undefined;
  const canFetchProject = routeProjectRef.length > 0 && (isUuidLike(routeProjectRef) || Boolean(lookupCompanyId));
  const projectQuery = useQuery({
    queryKey: [...queryKeys.projects.detail(routeProjectRef), lookupCompanyId ?? null],
    queryFn: () => projectsApi.get(routeProjectRef, lookupCompanyId),
    enabled: canFetchProject,
  });

  const project = projectQuery.data ?? null;
  const workspace = useMemo(
    () => project?.workspaces.find((item) => item.id === routeWorkspaceId) ?? null,
    [project, routeWorkspaceId],
  );
  const canonicalProjectRef = project ? projectRouteRef(project) : routeProjectRef;
  const initialState = useMemo(() => (workspace ? formStateFromWorkspace(workspace) : null), [workspace]);
  const isDirty = Boolean(form && initialState && JSON.stringify(form) !== JSON.stringify(initialState));

  useEffect(() => {
    if (!project?.companyId || project.companyId === selectedCompanyId) return;
    setSelectedCompanyId(project.companyId, { source: "route_sync" });
  }, [project?.companyId, selectedCompanyId, setSelectedCompanyId]);

  useEffect(() => {
    if (!workspace) return;
    setForm(formStateFromWorkspace(workspace));
    setErrorMessage(null);
  }, [workspace]);

  useEffect(() => {
    if (!project) return;
    setBreadcrumbs([
      { label: t("projects.title", "项目"), href: "/projects" },
      { label: project.name, href: `/projects/${canonicalProjectRef}` },
      { label: t("projectWorkspace.workspaces", "工作区"), href: `/projects/${canonicalProjectRef}/workspaces` },
      { label: workspace?.name ?? routeWorkspaceId },
    ]);
  }, [setBreadcrumbs, project, canonicalProjectRef, workspace?.name, routeWorkspaceId, t]);

  useEffect(() => {
    if (!project) return;
    if (routeProjectRef === canonicalProjectRef) return;
    navigate(projectWorkspaceUrl(project, routeWorkspaceId), { replace: true });
  }, [project, routeProjectRef, canonicalProjectRef, routeWorkspaceId, navigate]);

  const invalidateProject = () => {
    if (!project) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(project.id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(project.urlKey) });
    if (lookupCompanyId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(lookupCompanyId) });
    }
  };

  const updateWorkspace = useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      projectsApi.updateWorkspace(project!.id, routeWorkspaceId, patch, lookupCompanyId),
    onSuccess: () => {
      invalidateProject();
      setErrorMessage(null);
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : t("errorsFull.failedToSaveWorkspace", "保存工作区失败"));
    },
  });

  const setPrimaryWorkspace = useMutation({
    mutationFn: () => projectsApi.updateWorkspace(project!.id, routeWorkspaceId, { isPrimary: true }, lookupCompanyId),
    onSuccess: () => {
      invalidateProject();
      setErrorMessage(null);
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : t("errorsFull.failedToUpdateWorkspace", "更新工作区失败"));
    },
  });

  const controlRuntimeServices = useMutation({
    mutationFn: (action: "start" | "stop" | "restart") =>
      projectsApi.controlWorkspaceRuntimeServices(project!.id, routeWorkspaceId, action, lookupCompanyId),
    onSuccess: (result, action) => {
      invalidateProject();
      setErrorMessage(null);
      setRuntimeActionMessage(
        action === "stop"
          ? t("projectWorkspace.runtimeServicesStopped", "运行服务已停止")
          : action === "restart"
            ? t("projectWorkspace.runtimeServicesRestarted", "运行服务已重启")
            : t("projectWorkspace.runtimeServicesStarted", "运行服务已启动"),
      );
    },
    onError: (error) => {
      setRuntimeActionMessage(null);
      setErrorMessage(error instanceof Error ? error.message : t("errorsFull.failedToControlRuntimeServices", "控制运行服务失败"));
    },
  });

  if (projectQuery.isLoading) return <p className="text-sm text-muted-foreground">{t("states.loadingWorkspace", "正在加载工作区...")}</p>;
  if (projectQuery.error) {
    return (
      <p className="text-sm text-destructive">
        {projectQuery.error instanceof Error ? projectQuery.error.message : t("errorsFull.failedToLoadWorkspace", "加载工作区失败")}
      </p>
    );
  }
  if (!project || !workspace || !form || !initialState) {
    return <p className="text-sm text-muted-foreground">{t("projectWorkspace.notFound", "未找到此项目的工作区")}</p>;
  }

  const saveChanges = () => {
    const validationError = validateWorkspaceForm(form);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    const patch = buildWorkspacePatch(initialState, form);
    if (Object.keys(patch).length === 0) return;
    updateWorkspace.mutate(patch);
  };

  const sourceTypeDescription = SOURCE_TYPE_OPTIONS.find((option) => option.value === form.sourceType)?.description ?? null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/projects/${canonicalProjectRef}/workspaces`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t("projectWorkspace.backToWorkspaces", "返回工作区")}
          </Link>
        </Button>
        <div className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
          {workspace.isPrimary ? t("projectWorkspace.primaryWorkspace", "主工作区") : t("projectWorkspace.secondaryWorkspace", "次要工作区")}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.9fr)]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {t("projectWorkspace.projectWorkspace", "项目工作区")}
                </div>
                <h1 className="text-2xl font-semibold">{workspace.name}</h1>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  {t("projectWorkspace.description", "配置 Paperclip 附加到此项目的具体工作区。这些值驱动每个工作区的检出行为、子执行工作区的默认运行服务，并允许您在某个工作区需要特殊处理时覆盖配置或清理命令。")}
                </p>
              </div>
              {!workspace.isPrimary ? (
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={setPrimaryWorkspace.isPending}
                  onClick={() => setPrimaryWorkspace.mutate()}
                >
                  {setPrimaryWorkspace.isPending
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : <Check className="mr-2 h-4 w-4" />}
                  {t("projectWorkspace.makePrimary", "设为主工作区")}
                </Button>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300 sm:max-w-sm">
                  <Sparkles className="h-4 w-4" />
                  {t("projectWorkspace.primaryCodebaseWorkspace", "这是项目的主代码库工作区。")}
                </div>
              )}
            </div>

            <Separator className="my-5" />

            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("projectWorkspace.workspaceName", "工作区名称")}>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
                  value={form.name}
                  onChange={(event) => setForm((current) => current ? { ...current, name: event.target.value } : current)}
                  placeholder={t("projectWorkspace.workspaceNamePlaceholder", "工作区名称")}
                />
              </Field>

              <Field label={t("projectWorkspace.visibility", "可见性")}>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
                  value={form.visibility}
                  onChange={(event) =>
                    setForm((current) => current ? { ...current, visibility: event.target.value as ProjectWorkspaceVisibility } : current)
                  }
                >
                  {VISIBILITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-4 grid gap-4">
              <Field label={t("projectWorkspace.sourceType", "来源类型")} hint={sourceTypeDescription ?? undefined}>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
                  value={form.sourceType}
                  onChange={(event) =>
                    setForm((current) => current ? { ...current, sourceType: event.target.value as ProjectWorkspaceSourceType } : current)
                  }
                >
                  {SOURCE_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <Field label={t("projectWorkspace.localPath", "本地路径")}>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none"
                    value={form.cwd}
                    onChange={(event) => setForm((current) => current ? { ...current, cwd: event.target.value } : current)}
                    placeholder="/absolute/path/to/workspace"
                  />
                </Field>
                <div className="flex items-end">
                  <ChoosePathButton />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t("projectWorkspace.repoUrl", "仓库 URL")}>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
                    value={form.repoUrl}
                    onChange={(event) => setForm((current) => current ? { ...current, repoUrl: event.target.value } : current)}
                    placeholder="https://github.com/org/repo"
                  />
                </Field>
                <Field label={t("projectWorkspace.repoRef", "仓库引用")}>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none"
                    value={form.repoRef}
                    onChange={(event) => setForm((current) => current ? { ...current, repoRef: event.target.value } : current)}
                    placeholder="origin/main"
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t("projectWorkspace.defaultRef", "默认引用")}>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none"
                    value={form.defaultRef}
                    onChange={(event) => setForm((current) => current ? { ...current, defaultRef: event.target.value } : current)}
                    placeholder="origin/main"
                  />
                </Field>
                <Field label={t("projectWorkspace.sharedWorkspaceKey", "共享工作区键")}>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none"
                    value={form.sharedWorkspaceKey}
                    onChange={(event) => setForm((current) => current ? { ...current, sharedWorkspaceKey: event.target.value } : current)}
                    placeholder="frontend"
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t("projectWorkspace.remoteProvider", "远程提供商")}>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
                    value={form.remoteProvider}
                    onChange={(event) => setForm((current) => current ? { ...current, remoteProvider: event.target.value } : current)}
                    placeholder="codespaces"
                  />
                </Field>
                <Field label={t("projectWorkspace.remoteWorkspaceRef", "远程工作区引用")}>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none"
                    value={form.remoteWorkspaceRef}
                    onChange={(event) => setForm((current) => current ? { ...current, remoteWorkspaceRef: event.target.value } : current)}
                    placeholder="workspace-123"
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t("projectWorkspace.setupCommand", "配置命令")} hint={t("projectWorkspace.setupCommandHint", "当此工作区需要自定义引导时运行")}>
                  <textarea
                    className="min-h-28 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none"
                    value={form.setupCommand}
                    onChange={(event) => setForm((current) => current ? { ...current, setupCommand: event.target.value } : current)}
                    placeholder="pnpm install && pnpm dev"
                  />
                </Field>
                <Field label={t("projectWorkspace.cleanupCommand", "清理命令")} hint={t("projectWorkspace.cleanupCommandHint", "在项目级执行工作区拆除之前运行")}>
                  <textarea
                    className="min-h-28 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none"
                    value={form.cleanupCommand}
                    onChange={(event) => setForm((current) => current ? { ...current, cleanupCommand: event.target.value } : current)}
                    placeholder="pkill -f vite || true"
                  />
                </Field>
              </div>

              <Field label={t("projectWorkspace.runtimeServicesJson", "运行服务 JSON")} hint={t("projectWorkspace.runtimeServicesJsonHint", "此工作区的默认运行服务。执行工作区继承此配置，除非它们设置覆盖。如果您还不知道命令，请让您的 CEO 为您配置它们。")}>
                <textarea
                  className="min-h-36 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none"
                  value={form.runtimeConfig}
                  onChange={(event) => setForm((current) => current ? { ...current, runtimeConfig: event.target.value } : current)}
                  placeholder={"{\n  \"services\": [\n    {\n      \"name\": \"web\",\n      \"command\": \"pnpm dev\",\n      \"cwd\": \".\",\n      \"port\": { \"type\": \"auto\" },\n      \"readiness\": {\n        \"type\": \"http\",\n        \"urlTemplate\": \"http://127.0.0.1:${port}\"\n      },\n      \"expose\": {\n        \"type\": \"url\",\n        \"urlTemplate\": \"http://127.0.0.1:${port}\"\n      },\n      \"lifecycle\": \"shared\",\n      \"reuseScope\": \"project_workspace\"\n    }\n  ]\n}"}
                />
              </Field>
            </div>

            <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Button className="w-full sm:w-auto" disabled={!isDirty || updateWorkspace.isPending} onClick={saveChanges}>
                {updateWorkspace.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t("actions.save", "保存")}
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                disabled={!isDirty || updateWorkspace.isPending}
                onClick={() => {
                  setForm(initialState);
                  setErrorMessage(null);
                }}
              >
                {t("actions.reset", "重置")}
              </Button>
              {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
              {!errorMessage && runtimeActionMessage ? <p className="text-sm text-muted-foreground">{runtimeActionMessage}</p> : null}
              {!errorMessage && !isDirty ? <p className="text-sm text-muted-foreground">{t("emptyState.noUnsavedChanges", "无未保存的更改")}</p> : null}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="space-y-1">
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{t("projectWorkspace.workspaceFacts", "工作区事实")}</div>
              <h2 className="text-lg font-semibold">{t("projectWorkspace.currentState", "当前状态")}</h2>
            </div>
            <Separator className="my-4" />
            <DetailRow label={t("projects.title", "项目")}>
              <Link to={`/projects/${canonicalProjectRef}`} className="hover:underline">{project.name}</Link>
            </DetailRow>
            <DetailRow label={t("projectWorkspace.workspaceId", "工作区 ID")}>
              <span className="break-all font-mono text-xs">{workspace.id}</span>
            </DetailRow>
            <DetailRow label={t("projectWorkspace.localPath", "本地路径")}>
              <span className="break-all font-mono text-xs">{workspace.cwd ?? t("projectWorkspace.none", "无")}</span>
            </DetailRow>
            <DetailRow label={t("projectWorkspace.repo", "仓库")}>
              {workspace.repoUrl && isSafeExternalUrl(workspace.repoUrl) ? (
                <a href={workspace.repoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                  {workspace.repoUrl}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : workspace.repoUrl ? (
                <span className="break-all font-mono text-xs">{workspace.repoUrl}</span>
              ) : t("projectWorkspace.none", "无")}
            </DetailRow>
            <DetailRow label={t("projectWorkspace.defaultRef", "默认引用")}>{workspace.defaultRef ?? t("projectWorkspace.none", "无")}</DetailRow>
            <DetailRow label={t("projectWorkspace.updated", "更新于")}>{new Date(workspace.updatedAt).toLocaleString()}</DetailRow>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{t("projectWorkspace.runtimeServices", "运行服务")}</div>
                <h2 className="text-lg font-semibold">{t("projectWorkspace.attachedServices", "附加服务")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("projectWorkspace.attachedServicesDesc", "此项目工作区的共享服务。执行工作区继承此配置，除非它们覆盖它。")}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={controlRuntimeServices.isPending || !workspace.runtimeConfig?.workspaceRuntime || !workspace.cwd}
                  onClick={() => controlRuntimeServices.mutate("start")}
                >
                  {controlRuntimeServices.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                  {t("actions.start", "启动")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={controlRuntimeServices.isPending || !workspace.cwd}
                  onClick={() => controlRuntimeServices.mutate("restart")}
                >
                  {controlRuntimeServices.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                  {t("actions.restart", "重启")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={controlRuntimeServices.isPending || !hasActiveRuntimeServices(workspace)}
                  onClick={() => controlRuntimeServices.mutate("stop")}
                >
                  {controlRuntimeServices.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                  {t("actions.stop", "停止")}
                </Button>
              </div>
            </div>
            <Separator className="my-4" />
            {workspace.runtimeServices && workspace.runtimeServices.length > 0 ? (
              <div className="space-y-3">
                {workspace.runtimeServices.map((service) => (
                  <div key={service.id} className="rounded-xl border border-border/80 bg-background px-3 py-2">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{service.serviceName}</div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          {service.url ? (
                            <a href={service.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                              {service.url}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : null}
                          {service.port ? <div>{t("projectWorkspace.port", "端口")} {service.port}</div> : null}
                          <div>{service.command ?? t("projectWorkspace.noCommandRecorded", "未记录命令")}</div>
                          {service.cwd ? <div className="break-all font-mono">{service.cwd}</div> : null}
                        </div>
                      </div>
                      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground sm:text-right">
                        {service.status} · {service.healthStatus}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {workspace.runtimeConfig?.workspaceRuntime
                  ? t("projectWorkspace.noRuntimeServicesRunning", "此工作区当前无运行服务。")
                  : t("projectWorkspace.noRuntimeServiceConfigured", "此工作区尚未配置运行服务默认值。")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}