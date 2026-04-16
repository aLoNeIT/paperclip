import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "@/lib/router";
import { accessApi } from "../api/access";
import { authApi } from "../api/auth";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export function BoardClaimPage() {
  const queryClient = useQueryClient();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const token = (params.token ?? "").trim();
  const code = (searchParams.get("code") ?? "").trim();
  const currentPath = useMemo(
    () => `/board-claim/${encodeURIComponent(token)}${code ? `?code=${encodeURIComponent(code)}` : ""}`,
    [token, code],
  );

  const sessionQuery = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: () => authApi.getSession(),
    retry: false,
  });
  const statusQuery = useQuery({
    queryKey: ["board-claim", token, code],
    queryFn: () => accessApi.getBoardClaimStatus(token, code),
    enabled: token.length > 0 && code.length > 0,
    retry: false,
  });

  const claimMutation = useMutation({
    mutationFn: () => accessApi.claimBoard(token, code),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.session });
      await queryClient.invalidateQueries({ queryKey: queryKeys.health });
      await queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.companies.stats });
      await statusQuery.refetch();
    },
  });

  if (!token || !code) {
    return <div className="mx-auto max-w-xl py-10 text-sm text-destructive">{t("boardClaim.invalidUrl", "无效的董事会声明 URL。")}</div>;
  }

  if (statusQuery.isLoading || sessionQuery.isLoading) {
    return <div className="mx-auto max-w-xl py-10 text-sm text-muted-foreground">{t("boardClaim.loading", "正在加载声明验证...")}</div>;
  }

  if (statusQuery.error) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <div className="rounded-lg border border-border bg-card p-6">
          <h1 className="text-lg font-semibold">{t("boardClaim.unavailable", "声明验证不可用")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {statusQuery.error instanceof Error ? statusQuery.error.message : t("boardClaim.invalidOrExpired", "验证无效或已过期。")}
          </p>
        </div>
      </div>
    );
  }

  const status = statusQuery.data;
  if (!status) {
    return <div className="mx-auto max-w-xl py-10 text-sm text-destructive">{t("boardClaim.unavailable", "声明验证不可用。")}</div>;
  }

  if (status.status === "claimed") {
    return (
      <div className="mx-auto max-w-xl py-10">
        <div className="rounded-lg border border-border bg-card p-6">
          <h1 className="text-lg font-semibold">{t("boardClaim.claimed", "董事会所有权已声明")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("boardClaim.claimedDesc", "此实例现已链接到您的认证用户。")}
          </p>
          <Button asChild className="mt-4">
            <Link to="/">{t("boardClaim.openBoard", "打开董事会")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!sessionQuery.data) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <div className="rounded-lg border border-border bg-card p-6">
          <h1 className="text-lg font-semibold">{t("boardClaim.signInRequired", "需要登录")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("boardClaim.signInRequiredDesc", "登录或创建账号，然后返回此页面以声明董事会所有权。")}
          </p>
          <Button asChild className="mt-4">
            <Link to={`/auth?next=${encodeURIComponent(currentPath)}`}>{t("boardClaim.signInOrCreate", "登录 / 创建账号")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl py-10">
      <div className="rounded-lg border border-border bg-card p-6">
        <h1 className="text-xl font-semibold">{t("boardClaim.title", "声明董事会所有权")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("boardClaim.desc", "这将把您的用户提升为实例管理员，并从本地可信模式迁移公司所有权访问权限。")}
        </p>

        {claimMutation.error && (
          <p className="mt-3 text-sm text-destructive">
            {claimMutation.error instanceof Error ? claimMutation.error.message : t("boardClaim.failed", "声明董事会所有权失败")}
          </p>
        )}

        <Button
          className="mt-5"
          onClick={() => claimMutation.mutate()}
          disabled={claimMutation.isPending}
        >
          {claimMutation.isPending ? t("boardClaim.claiming", "声明中...") : t("boardClaim.claim", "声明所有权")}
        </Button>
      </div>
    </div>
  );
}
