import { useEffect, useId, useState } from 'react';

import { cn } from '@/lib/utils';

import {
  OFFICE_INSET_PANEL_CLASS,
  getOfficeChromeButtonClass,
} from './chrome';

function buildGatewayUrl(port: number, path: string, params: Record<string, string>, host?: string): string {
  const base = host || `http://localhost:${port}`;
  const url = new URL(path, base);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.toString();
}

function getPlatformDisplayName(name: string): string {
  return name.toLowerCase();
}

export interface AgentPlatform {
  name: string;
  accountId?: string;
  appId?: string;
  botOpenId?: string;
  botUserId?: string;
}

export interface AgentCardSession {
  lastActive: number | null;
  totalTokens: number;
  contextTokens: number;
  sessionCount: number;
  todayAvgResponseMs: number;
  messageCount: number;
  weeklyResponseMs: number[];
  weeklyTokens: number[];
}

export interface AgentCardAgent {
  id: string;
  name: string;
  emoji: string;
  model: string;
  platforms: AgentPlatform[];
  session?: AgentCardSession;
}

export interface AgentModelOptionGroup {
  providerId: string;
  providerName: string;
  accessMode?: "auth" | "api_key";
  models: Array<{ id: string; name: string }>;
}

export interface PlatformTestResult {
  ok: boolean;
  reply?: string;
  detail?: string;
  error?: string;
  elapsed: number;
}

export interface AgentModelTestResult {
  ok: boolean;
  text?: string;
  error?: string;
  elapsed: number;
}

export interface AgentSessionTestResult {
  ok: boolean;
  reply?: string;
  error?: string;
  elapsed: number;
}

type TFunc = (key: string) => string;

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

function formatMs(ms: number): string {
  if (!ms) return "-";
  if (ms < 1000) return ms + "ms";
  return (ms / 1000).toFixed(1) + "s";
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

function ErrorStatusWithCopy({ error, className }: { error?: string; className?: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const errorText = (error || "Unknown error").trim() || "Unknown error";

  const onCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = await copyText(errorText);
    setCopyState(ok ? "copied" : "failed");
  };

  return (
    <span
      className={`group relative inline-flex items-center ${className || ""}`}
      onMouseLeave={() => setCopyState("idle")}
    >
      <span className="text-red-400 text-sm cursor-help">❌</span>
      <span
        aria-hidden="true"
        className="absolute left-full top-1/2 z-40 hidden h-8 w-2 -translate-y-1/2 bg-transparent group-hover:block group-focus-within:block"
      />
      <span className="absolute left-full top-1/2 z-50 ml-2 hidden w-max max-w-[min(24rem,calc(100vw-1rem))] -translate-y-1/2 rounded-md border border-red-500/30 bg-[var(--card)] px-2 py-1.5 text-xs text-[var(--text)] shadow-lg group-hover:block group-focus-within:block">
        <span className="inline-flex items-start gap-1.5">
          <span className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={onCopy}
              className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--accent)]"
            >
              {copyState === "copied" ? "已复制" : "复制"}
            </button>
            {copyState === "failed" && (
              <span className="text-[10px] text-amber-300">复制失败</span>
            )}
          </span>
          <span className="whitespace-pre-wrap break-words">{errorText}</span>
        </span>
      </span>
    </span>
  );
}

function PlatformBadge({
  platform,
  agentId,
  gatewayPort,
  gatewayToken,
  gatewayHost,
  t,
  testResult,
}: {
  platform: AgentPlatform;
  agentId: string;
  gatewayPort: number;
  gatewayToken?: string;
  gatewayHost?: string;
  t: TFunc;
  testResult?: PlatformTestResult | null;
}) {
  const pName = platform.name;
  const displayName = getPlatformDisplayName(pName);
  const badgeWidthClass = "w-[8.25rem]";
  const knownMeta: Record<string, { remoteLogoSrc: string; logoFallbackSrc: string; badgeStyle: string; logoSizeClass?: string }> = {
    feishu: {
      remoteLogoSrc: "https://cdn.simpleicons.org/lark/2E5BFF",
      logoFallbackSrc: "/assets/platform-logos/feishu-favicon.png?v=1",
      badgeStyle:
        'border-black/10 bg-black/[0.04] text-foreground/80 hover:bg-black/[0.07] dark:border-white/10 dark:bg-white/[0.08] dark:hover:bg-white/[0.12]',
      logoSizeClass: "w-[1.09375rem] h-[1.09375rem]",
    },
    yuanbao: {
      remoteLogoSrc: "https://cdn-hybrid-prod.hunyuan.tencent.com/manual/favicon.png",
      logoFallbackSrc: "/assets/platform-logos/yuanbao-favicon.png?v=1",
      badgeStyle:
        'border-black/10 bg-black/[0.04] text-foreground/80 hover:bg-black/[0.07] dark:border-white/10 dark:bg-white/[0.08] dark:hover:bg-white/[0.12]',
    },
    discord: {
      remoteLogoSrc: "https://cdn.simpleicons.org/discord/5865F2",
      logoFallbackSrc: "/assets/platform-logos/discord.svg",
      badgeStyle:
        'border-black/10 bg-black/[0.04] text-foreground/80 hover:bg-black/[0.07] dark:border-white/10 dark:bg-white/[0.08] dark:hover:bg-white/[0.12]',
    },
    telegram: {
      remoteLogoSrc: "https://cdn.simpleicons.org/telegram/26A5E4",
      logoFallbackSrc: "/assets/platform-logos/telegram.svg",
      badgeStyle:
        'border-black/10 bg-black/[0.04] text-foreground/80 hover:bg-black/[0.07] dark:border-white/10 dark:bg-white/[0.08] dark:hover:bg-white/[0.12]',
    },
    whatsapp: {
      remoteLogoSrc: "https://cdn.simpleicons.org/whatsapp/25D366",
      logoFallbackSrc: "/assets/platform-logos/whatsapp.svg",
      badgeStyle:
        'border-black/10 bg-black/[0.04] text-foreground/80 hover:bg-black/[0.07] dark:border-white/10 dark:bg-white/[0.08] dark:hover:bg-white/[0.12]',
    },
    qqbot: {
      remoteLogoSrc: "/assets/platform-logos/qq-favicon.ico?v=1",
      logoFallbackSrc: "/assets/platform-logos/qq-favicon.ico?v=1",
      badgeStyle:
        'border-black/10 bg-black/[0.04] text-foreground/80 hover:bg-black/[0.07] dark:border-white/10 dark:bg-white/[0.08] dark:hover:bg-white/[0.12]',
    },
    wecom: {
      remoteLogoSrc: "/assets/platform-logos/wecom.svg?v=1",
      logoFallbackSrc: "/assets/platform-logos/wecom.svg?v=1",
      badgeStyle:
        'border-black/10 bg-black/[0.04] text-foreground/80 hover:bg-black/[0.07] dark:border-white/10 dark:bg-white/[0.08] dark:hover:bg-white/[0.12]',
    },
  };
  const meta = knownMeta[displayName];
  const logoSizeClass = meta?.logoSizeClass || "w-3.5 h-3.5";

  let sessionKey: string;
  if (pName === "feishu" && platform.botOpenId) {
    sessionKey = `agent:${agentId}:feishu:direct:${platform.botOpenId}`;
  } else if (platform.botUserId) {
    sessionKey = `agent:${agentId}:${pName}:direct:${platform.botUserId}`;
  } else {
    sessionKey = `agent:${agentId}:main`;
  }
  let sessionUrl = buildGatewayUrl(gatewayPort, "/chat", { session: sessionKey }, gatewayHost);
  if (gatewayToken) sessionUrl = buildGatewayUrl(gatewayPort, "/chat", { session: sessionKey, token: gatewayToken }, gatewayHost);

  const badgeStyle =
    meta?.badgeStyle ||
    'border-black/10 bg-black/[0.04] text-foreground/80 hover:bg-black/[0.07] dark:border-white/10 dark:bg-white/[0.08] dark:hover:bg-white/[0.12]';
  const translated = t(`platform.${displayName}`);
  const labelRaw = translated !== `platform.${displayName}` ? translated : displayName;
  const label = labelRaw.replace(/^[^\p{L}\p{N}]+/u, "").trim() || displayName;

  return (
    <div className="inline-flex items-center gap-1.5 max-w-full">
      <a
        href={sessionUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        title={t("agent.openChat")}
        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-all hover:scale-105 hover:shadow-md min-w-0 ${badgeWidthClass} ${badgeStyle}`}
      >
        {meta ? (
          <img
            src={meta.remoteLogoSrc}
            alt={`${label} logo`}
            className={`${logoSizeClass} shrink-0`}
            onError={(e) => {
              if (e.currentTarget.dataset.fallbackApplied === "1") return;
              e.currentTarget.dataset.fallbackApplied = "1";
              e.currentTarget.src = meta.logoFallbackSrc;
            }}
          />
        ) : (
          <span className="inline-flex w-3.5 h-3.5 items-center justify-center rounded bg-white/10 text-[9px] font-semibold shrink-0">
            {pName.slice(0, 2).toUpperCase()}
          </span>
        )}
        <span className="shrink-0">{label}</span>
        {pName === "feishu" && platform.accountId && (
          <span className="opacity-60 truncate max-w-[4.5rem]">({platform.accountId})</span>
        )}
        <span className="opacity-50 text-[10px]">↗</span>
      </a>
      {testResult === undefined ? (
        <span className="inline-flex w-5 justify-end text-xs text-[var(--text-muted)]">--</span>
      ) : testResult === null ? (
        <span className="inline-flex w-5 justify-end text-xs text-[var(--text-muted)] animate-pulse">⏳</span>
      ) : testResult.ok ? (
        <span className="inline-flex w-5 justify-end text-green-400 text-sm cursor-help" title={`${testResult.elapsed}ms${testResult.detail ? " · " + testResult.detail : testResult.reply ? " · " + testResult.reply : ""}`}>✅</span>
      ) : (
        <ErrorStatusWithCopy error={testResult.error} className="w-5 justify-end" />
      )}
    </div>
  );
}

export function ModelBadge({ model, accessMode }: { model: string; accessMode?: "auth" | "api_key" }) {
  const [provider, modelName] = model.includes("/")
    ? model.split("/", 2)
    : ["default", model];

  const neutralBadgeClass =
    'border-black/10 bg-black/[0.05] text-foreground dark:border-white/10 dark:bg-white/[0.08]';
  const colors: Record<string, string> = {
    "yunyi-claude":
      neutralBadgeClass,
    minimax:
      neutralBadgeClass,
    volcengine:
      neutralBadgeClass,
    bailian:
      neutralBadgeClass,
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
        colors[provider] || neutralBadgeClass
      }`}
    >
      {modelName}{accessMode ? ` (${accessMode})` : ""}
    </span>
  );
}

function MiniSparkline({ data, width = 120, height = 24, color: fixedColor }: { data: number[]; width?: number; height?: number; color?: string }) {
  const gradientId = useId().replace(/:/g, '');
  const hasData = data.some(v => v > 0);
  if (!hasData) return null;

  const validValues = data.filter(v => v > 0);
  let trending: "up" | "down" | "flat" = "flat";
  if (validValues.length >= 2) {
    const last = validValues[validValues.length - 1];
    const prev = validValues[validValues.length - 2];
    trending = last > prev ? "up" : last < prev ? "down" : "flat";
  }
  const color = fixedColor || (trending === "up" ? "#f87171" : trending === "down" ? "#4ade80" : "#f59e0b");

  const max = Math.max(...data);
  const min = Math.min(...data.filter(v => v > 0), max);
  const range = max - min || 1;
  const pad = 2;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = v === 0 ? height - pad : (height - pad) - ((v - min) / range) * (height - pad * 2 - 2);
    return { x, y, v };
  });
  const line = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `${pts[0].x},${height} ${line} ${pts[pts.length - 1].x},${height}`;
  const id = `spark-${gradientId}`;
  return (
    <span className="inline-flex items-center gap-1">
      <svg width={width} height={height} className="inline-block align-middle" aria-label={data.map(v => v ? formatMs(v) : "-").join(" → ")}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#${id})`} />
        <polyline points={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        {pts.filter((p) => p.v > 0).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2} fill={color} opacity={0.9} />
        ))}
      </svg>
    </span>
  );
}

function AgentStatusBadge({ state, t }: { state?: string; t: TFunc }) {
  const config: Record<string, { dot: string; text: string; color: string; pulse?: boolean }> = {
    working: { dot: "bg-green-400", text: t("agent.status.working"), color: "text-green-400", pulse: true },
    online: { dot: "bg-green-400", text: t("agent.status.online"), color: "text-green-400" },
    idle: { dot: "bg-yellow-400", text: t("agent.status.idle"), color: "text-yellow-400" },
    offline: { dot: "bg-red-400", text: t("agent.status.offline"), color: "text-red-400" },
  };
  const c = config[state || "offline"] || config.offline;
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${c.color}`}>
      <span className={`w-2.5 h-2.5 rounded-full ${c.dot} ${c.pulse ? "animate-pulse" : ""}`} />
      {c.text}
    </span>
  );
}

export function AgentCard({
  agent,
  gatewayPort,
  gatewayToken,
  gatewayHost,
  t,
  testResult,
  platformTestResults,
  sessionTestResult,
  agentState,
  dmSessionResults,
  providerAccessModeMap,
  modelOptions,
  onModelChange,
}: {
  agent: AgentCardAgent;
  gatewayPort: number;
  gatewayToken?: string;
  gatewayHost?: string;
  t: TFunc;
  testResult?: AgentModelTestResult | null;
  platformTestResults?: Record<string, PlatformTestResult | null>;
  sessionTestResult?: AgentSessionTestResult | null;
  agentState?: string;
  dmSessionResults?: Record<string, PlatformTestResult | null>;
  providerAccessModeMap?: Record<string, "auth" | "api_key">;
  modelOptions?: AgentModelOptionGroup[];
  onModelChange?: (agentId: string, model: string) => Promise<void>;
}) {
  const [isEditingModel, setIsEditingModel] = useState(false);
  const [draftModel, setDraftModel] = useState(agent.model);
  const [isSavingModel, setIsSavingModel] = useState(false);
  const [modelSaveError, setModelSaveError] = useState<string | null>(null);
  const sessionKey = `agent:${agent.id}:main`;
  let sessionUrl = buildGatewayUrl(gatewayPort, "/chat", { session: sessionKey }, gatewayHost);
  if (gatewayToken) sessionUrl = buildGatewayUrl(gatewayPort, "/chat", { session: sessionKey, token: gatewayToken }, gatewayHost);
  const modelProvider = agent.model.includes("/") ? agent.model.split("/", 1)[0] : "default";
  const modelAccessMode = providerAccessModeMap?.[modelProvider];
  const canSwitchModel = !!onModelChange && !!modelOptions && modelOptions.length > 0;
  const knownModelRefs = new Set(
    (modelOptions || []).flatMap((group) => group.models.map((model) => `${group.providerId}/${model.id}`)),
  );
  const currentModelKnown = knownModelRefs.has(agent.model);

  useEffect(() => {
    if (!isEditingModel) {
      setDraftModel(agent.model);
      setModelSaveError(null);
    }
  }, [agent.model, isEditingModel]);

  function formatTimeAgo(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("common.justNow");
    if (mins < 60) return `${mins} ${t("common.minutesAgo")}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ${t("common.hoursAgo")}`;
    const days = Math.floor(hours / 24);
    return `${days} ${t("common.daysAgo")}`;
  }

  async function handleModelSave(): Promise<void> {
    if (!onModelChange || !draftModel || draftModel === agent.model) return;
    setIsSavingModel(true);
    setModelSaveError(null);
    try {
      await onModelChange(agent.id, draftModel);
      setIsEditingModel(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("agent.modelApplyFailed");
      setModelSaveError(message);
    } finally {
      setIsSavingModel(false);
    }
  }

  return (
    <div
      className="rounded-2xl border border-black/10 bg-background/90 p-3 shadow-sm transition-colors hover:bg-black/[0.02] dark:border-white/10 dark:hover:bg-white/[0.03]"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xl">{agent.emoji}</span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-[var(--text)]">{agent.name} <span className="font-normal text-[var(--text-muted)]">({agent.id})</span></h3>
        </div>
        <AgentStatusBadge state={agentState} t={t} />
      </div>

      <div className="space-y-1">
        <div>
          <span className="text-xs text-[var(--text-muted)] block">Agent ID</span>
          <div className="flex items-center gap-2">
            <a href={sessionUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-all hover:scale-105 hover:shadow-md bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30 hover:bg-[var(--accent)]/40">
              {agent.id}
              <span className="opacity-50 text-[10px]">↗</span>
            </a>
            {sessionTestResult === undefined ? (
              <span className="text-xs text-[var(--text-muted)]">--</span>
            ) : sessionTestResult === null ? (
              <span className="text-xs text-[var(--text-muted)] animate-pulse">⏳</span>
            ) : sessionTestResult.ok ? (
              <span className="text-green-400 text-sm cursor-help" title={`${sessionTestResult.elapsed}ms${sessionTestResult.reply ? " · " + sessionTestResult.reply : ""}`}>✅</span>
            ) : (
              <ErrorStatusWithCopy error={sessionTestResult.error} />
            )}
          </div>
        </div>
        <div>
          <span className="text-xs text-[var(--text-muted)] block">{t("agent.model")}</span>
          <div className="flex items-center gap-2 flex-wrap">
            <ModelBadge model={agent.model} accessMode={modelAccessMode} />
            {testResult === undefined ? (
              <span className="text-xs text-[var(--text-muted)]">--</span>
            ) : testResult === null ? (
              <span className="text-xs text-[var(--text-muted)] animate-pulse">⏳</span>
            ) : testResult.ok ? (
              <span className="text-green-400 text-sm" title={`${testResult.elapsed}ms${testResult.text ? " · " + testResult.text : ""}`}>✅</span>
            ) : (
              <ErrorStatusWithCopy error={testResult.error} />
            )}
            {canSwitchModel && !isEditingModel && (
              <button
                type="button"
                onClick={() => {
                  setDraftModel(agent.model);
                  setModelSaveError(null);
                  setIsEditingModel(true);
                }}
                className={getOfficeChromeButtonClass({ size: 'xs', shape: 'pill' })}
              >
                {t("agent.switchModel")}
              </button>
            )}
          </div>
          {canSwitchModel && isEditingModel && (
            <div className={cn(OFFICE_INSET_PANEL_CLASS, 'mt-2 space-y-2 p-2')}>
              <select
                value={draftModel}
                onChange={(e) => setDraftModel(e.target.value)}
                disabled={isSavingModel}
                className="w-full rounded-lg border border-black/10 bg-background px-2 py-2 text-sm text-foreground dark:border-white/10"
              >
                {!currentModelKnown && (
                  <option value={agent.model}>{`${t("agent.currentUnknownModel")}: ${agent.model}`}</option>
                )}
                {(modelOptions || []).map((group) => (
                  <optgroup key={group.providerId} label={group.providerName}>
                    {group.models.map((model) => (
                      <option key={`${group.providerId}/${model.id}`} value={`${group.providerId}/${model.id}`}>
                        {`${group.providerId} / ${model.name || model.id}`}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleModelSave()}
                  disabled={isSavingModel || !draftModel || draftModel === agent.model}
                  className={cn(
                    getOfficeChromeButtonClass({ active: true, size: 'xs' }),
                    'disabled:opacity-50'
                  )}
                >
                  {isSavingModel ? t("agent.modelSaving") : t("agent.saveModel")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraftModel(agent.model);
                    setModelSaveError(null);
                    setIsEditingModel(false);
                  }}
                  disabled={isSavingModel}
                  className={cn(
                    getOfficeChromeButtonClass({ size: 'xs' }),
                    'disabled:opacity-50'
                  )}
                >
                  {t("agent.cancelModel")}
                </button>
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">
                {t("agent.modelApplyHint")}
              </p>
              {modelSaveError && (
                <p className="text-xs text-red-400">{modelSaveError}</p>
              )}
            </div>
          )}
        </div>

        <div>
          <span className="text-xs text-[var(--text-muted)] block">{t("agent.platform")}</span>
          <div className="flex flex-col gap-1">
            {agent.platforms.map((p, i) => {
              const pKey = `${agent.id}:${p.name}`;
              const pResult = platformTestResults ? platformTestResults[pKey] : undefined;
              const dmKey = `${agent.id}:${p.name}`;
              const dmResult = dmSessionResults ? dmSessionResults[dmKey] : undefined;
              return (
                <div key={i} className="grid grid-cols-2 items-center gap-2">
                  <PlatformBadge platform={p} agentId={agent.id} gatewayPort={gatewayPort} gatewayToken={gatewayToken} gatewayHost={gatewayHost} t={t} testResult={pResult} />
                  <div className="flex justify-end">
                    {dmResult === undefined ? (
                      <span className="text-sm text-[var(--text-muted)]">DM Session: --</span>
                    ) : dmResult === null ? (
                      <span className="text-sm text-[var(--text-muted)] animate-pulse">DM Session: ⏳</span>
                    ) : dmResult.ok ? (
                      <span className="text-green-400 text-sm cursor-help" title={`DM Session ${dmResult.elapsed}ms${dmResult.detail ? " · " + dmResult.detail : ""}`}>DM Session: ✅</span>
                    ) : (
                      <span className="text-red-400 text-sm inline-flex items-center gap-1">
                        DM Session:
                        <ErrorStatusWithCopy error={dmResult.error} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {agent.session && (
          <div className="pt-1 mt-1 border-t border-[var(--border)]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-muted)]">{t("agent.sessionCount")}</span>
              <div className="flex items-center gap-2">
                <a
                  href={`/sessions?agent=${agent.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[var(--accent)] hover:underline cursor-pointer"
                >
                  {agent.session.sessionCount} →
                </a>
                <a
                  href={`/stats?agent=${agent.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[var(--accent)] hover:underline cursor-pointer text-[10px]"
                >
                  📊 {t("agent.stats")}
                </a>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-[var(--text-muted)]">{t("agent.messageCount")}</span>
              <span className="text-[var(--text)]">{agent.session.messageCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-[var(--text-muted)]">{t("agent.tokenUsage")}</span>
              {agent.session.weeklyTokens && <MiniSparkline data={agent.session.weeklyTokens} color="#4ade80" />}
              <span className="text-[var(--text)] cursor-help" title={t("agent.totalTokenTip")}>{formatTokens(agent.session.totalTokens)}</span>
            </div>
            {agent.session.lastActive && (
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-[var(--text-muted)]">{t("agent.lastActive")}</span>
                <span className="text-[var(--text)]">{formatTimeAgo(agent.session.lastActive)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-[var(--text-muted)]">{t("agent.todayAvgResponse")}</span>
              {agent.session.weeklyResponseMs && <MiniSparkline data={agent.session.weeklyResponseMs} />}
              {(() => {
                const val = agent.session.todayAvgResponseMs;
                const weekly = agent.session.weeklyResponseMs || [];
                const validVals = weekly.filter(v => v > 0);
                let arrow = "";
                if (validVals.length >= 2) {
                  const last = validVals[validVals.length - 1];
                  const prev = validVals[validVals.length - 2];
                  arrow = last > prev ? "↗" : last < prev ? "↘" : "";
                }
                const colorClass = !val ? "text-[var(--text-muted)]"
                  : val > 50000 ? "text-red-400"
                  : val > 30000 ? "text-yellow-400"
                  : "text-green-400";
                return (
                  <span title={t("agent.todayAvgResponseTip")} className={`font-mono cursor-help ${colorClass}`}>
                    {val ? formatMs(val) : "--"}{arrow && <span className="ml-0.5">{arrow}</span>}
                  </span>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
