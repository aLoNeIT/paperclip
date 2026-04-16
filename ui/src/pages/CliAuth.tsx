import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "@/lib/router";
import { Button } from "@/components/ui/button";
import { accessApi } from "../api/access";
import { authApi } from "../api/auth";
import { queryKeys } from "../lib/queryKeys";
import { useTranslation } from "react-i18next";

export function CliAuthPage() {
  const queryClient = useQueryClient();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const challengeId = (params.id ?? "").trim();
  const token = (searchParams.get("token") ?? "").trim();
  const currentPath = useMemo(
    () => `/cli-auth/${encodeURIComponent(challengeId)}${token ? `?token=${encodeURIComponent(token)}` : ""}`,
    [challengeId, token],
  );

  const sessionQuery = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: () => authApi.getSession(),
    retry: false,
  });
  const challengeQuery = useQuery({
    queryKey: ["cli-auth-challenge", challengeId, token],
    queryFn: () => accessApi.getCliAuthChallenge(challengeId, token),
    enabled: challengeId.length > 0 && token.length > 0,
    retry: false,
  });

  const approveMutation = useMutation({
    mutationFn: () => accessApi.approveCliAuthChallenge(challengeId, token),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.session });
      await challengeQuery.refetch();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => accessApi.cancelCliAuthChallenge(challengeId, token),
    onSuccess: async () => {
      await challengeQuery.refetch();
    },
  });

  if (!challengeId || !token) {
    return <div className="mx-auto max-w-xl py-10 text-sm text-destructive">{t("cliAuth.invalidUrl", "无效的 CLI 认证 URL。")}</div>;
  }

  if (sessionQuery.isLoading || challengeQuery.isLoading) {
    return <div className="mx-auto max-w-xl py-10 text-sm text-muted-foreground">{t("cliAuth.loading", "正在加载 CLI 认证验证...")}</div>;
  }

  if (challengeQuery.error) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <div className="rounded-lg border border-border bg-card p-6">
          <h1 className="text-lg font-semibold">{t("cliAuth.unavailable", "CLI 认证验证不可用")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {challengeQuery.error instanceof Error ? challengeQuery.error.message : t("cliAuth.invalidOrExpired", "验证无效或已过期。")}
          </p>
        </div>
      </div>
    );
  }

  const challenge = challengeQuery.data;
  if (!challenge) {
    return <div className="mx-auto max-w-xl py-10 text-sm text-destructive">{t("cliAuth.unavailable", "CLI 认证验证不可用。")}</div>;
  }

  if (challenge.status === "approved") {
    return (
      <div className="mx-auto max-w-xl py-10">
        <div className="rounded-lg border border-border bg-card p-6">
          <h1 className="text-xl font-semibold">{t("cliAuth.approved", "CLI 访问已批准")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("cliAuth.approvedDesc", "Paperclip CLI 现在可以在请求的机器上完成认证。")}
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            {t("cliAuth.command", "命令")}：<span className="font-mono text-foreground">{challenge.command}</span>
          </p>
        </div>
      </div>
    );
  }

  if (challenge.status === "cancelled" || challenge.status === "expired") {
    return (
      <div className="mx-auto max-w-xl py-10">
        <div className="rounded-lg border border-border bg-card p-6">
          <h1 className="text-xl font-semibold">
            {challenge.status === "expired" ? t("cliAuth.expired", "CLI 认证验证已过期") : t("cliAuth.cancelled", "CLI 认证验证已取消")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("cliAuth.expiredOrCancelledDesc", "从终端重新启动 CLI 认证流程以生成新的批准请求。")}
          </p>
        </div>
      </div>
    );
  }

  if (challenge.requiresSignIn || !sessionQuery.data) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <div className="rounded-lg border border-border bg-card p-6">
          <h1 className="text-xl font-semibold">{t("cliAuth.signInRequired", "需要登录")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("cliAuth.signInRequiredDesc", "登录或创建账号，然后返回此页面以批准 CLI 访问请求。")}
          </p>
          <Button asChild className="mt-4">
            <Link to={`/auth?next=${encodeURIComponent(currentPath)}`}>{t("cliAuth.signInOrCreate", "登录 / 创建账号")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl py-10">
      <div className="rounded-lg border border-border bg-card p-6">
        <h1 className="text-xl font-semibold">{t("cliAuth.title", "批准 Paperclip CLI 访问")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("cliAuth.desc", "本地 Paperclip CLI 进程正在请求对此实例的董事会访问权限。")}
        </p>

        <div className="mt-5 space-y-3 text-sm">
          <div>
            <div className="text-muted-foreground">{t("cliAuth.commandLabel", "命令")}</div>
            <div className="font-mono text-foreground">{challenge.command}</div>
          </div>
          <div>
            <div className="text-muted-foreground">{t("cliAuth.client", "客户端")}</div>
            <div className="text-foreground">{challenge.clientName ?? "paperclipai cli"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">{t("cliAuth.requestedAccess", "请求访问")}</div>
            <div className="text-foreground">
              {challenge.requestedAccess === "instance_admin_required" ? t("cliAuth.instanceAdmin", "实例管理员") : t("cliAuth.board", "董事会")}
            </div>
          </div>
          {challenge.requestedCompanyName && (
            <div>
              <div className="text-muted-foreground">{t("cliAuth.requestedCompany", "请求公司")}</div>
              <div className="text-foreground">{challenge.requestedCompanyName}</div>
            </div>
          )}
        </div>

        {(approveMutation.error || cancelMutation.error) && (
          <p className="mt-4 text-sm text-destructive">
            {(approveMutation.error ?? cancelMutation.error) instanceof Error
              ? ((approveMutation.error ?? cancelMutation.error) as Error).message
              : t("cliAuth.failed", "更新 CLI 认证验证失败")}
          </p>
        )}

        {!challenge.canApprove && (
          <p className="mt-4 text-sm text-destructive">
            {t("cliAuth.requiresInstanceAdmin", "此验证需要实例管理员访问权限。请使用实例管理员账号登录以批准它。")}
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <Button
            onClick={() => approveMutation.mutate()}
            disabled={!challenge.canApprove || approveMutation.isPending || cancelMutation.isPending}
          >
            {approveMutation.isPending ? t("cliAuth.approving", "批准中...") : t("cliAuth.approve", "批准 CLI 访问")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => cancelMutation.mutate()}
            disabled={approveMutation.isPending || cancelMutation.isPending}
          >
            {cancelMutation.isPending ? t("cliAuth.cancelling", "取消中...") : t("common.cancel", "取消")}
          </Button>
        </div>
      </div>
    </div>
  );
}
