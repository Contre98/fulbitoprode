"use client";

import Image from "next/image";
import { Check, Clock3, Lock, Shield } from "lucide-react";
import { pointsToneColors } from "@/lib/design-tokens";
import type { MatchCardData } from "@/lib/types";
import { PredictionStepper } from "@/components/matches/PredictionStepper";

interface MatchCardProps extends MatchCardData {
  showPredictionStepper?: boolean;
  stepper?: {
    homeValue: number | null;
    awayValue: number | null;
    onHomeIncrement?: () => void;
    onHomeDecrement?: () => void;
    onAwayIncrement?: () => void;
    onAwayDecrement?: () => void;
    min?: number;
    max?: number;
    disabled?: boolean;
  };
  predictionBox?: {
    homeValue: number | null;
    awayValue: number | null;
    onClick?: () => void;
    disabled?: boolean;
    highlighted?: boolean;
  };
}

function TeamBadge({
  code,
  logoUrl,
  align = "left",
  compact = false,
  tiny = false
}: {
  code: string;
  logoUrl?: string;
  align?: "left" | "right";
  compact?: boolean;
  tiny?: boolean;
}) {
  const avatarSize = tiny ? "h-8 w-8" : "h-10 w-10";
  const teamWidth = compact ? "w-[108px]" : "w-[126px]";

  return (
    <div
      className={`flex ${teamWidth} items-center ${align === "right" ? "justify-end" : "justify-start"} ${tiny ? "gap-2" : "gap-2.5"}`}
    >
      {align === "right" ? <p className="text-[26px] font-black text-[var(--text-primary)]">{code}</p> : null}
      <div className={`relative ${avatarSize} flex items-center justify-center`}>
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={`${code} logo`}
            fill
            unoptimized
            sizes={tiny ? "32px" : "40px"}
            className="absolute inset-0 object-contain p-[2px]"
          />
        ) : (
          <Shield size={tiny ? 16 : 20} className="text-[var(--text-secondary)]" />
        )}
      </div>
      {align === "left" ? <p className="text-[26px] font-black text-[var(--text-primary)]">{code}</p> : null}
    </div>
  );
}

function ScoreCenter({
  home,
  away,
  prediction
}: {
  home: number;
  away: number;
  prediction?: { home: number; away: number };
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-2">
        <span className="text-[34px] leading-none font-black tracking-tighter text-[var(--text-primary)]">{home}</span>
        <span className="text-[12px] text-[var(--text-secondary)]">-</span>
        <span className="text-[34px] leading-none font-black tracking-tighter text-[var(--text-primary)]">{away}</span>
      </div>
      {prediction ? (
        <p className="text-[10px] font-semibold tracking-[0.5px] text-[var(--text-secondary)]">TU PRODE: {prediction.home}-{prediction.away}</p>
      ) : null}
    </div>
  );
}

function statusPillLabel(match: MatchCardData) {
  if (match.status === "live") {
    return match.meta.label;
  }
  if (match.status === "upcoming") {
    return match.meta.label;
  }
  return match.meta.label;
}

export function MatchCard({
  status,
  homeTeam,
  awayTeam,
  score,
  prediction,
  meta,
  points,
  progress,
  showPredictionStepper,
  stepper,
  predictionBox,
  isLocked,
  deadlineAt,
  kickoffAt
}: MatchCardProps) {
  const isLive = status === "live";
  const isUpcoming = status === "upcoming";
  const isFinal = status === "final";

  const tone = points ? pointsToneColors[points.tone] : pointsToneColors.neutral;
  const statusLabel = statusPillLabel({
    id: "",
    status,
    homeTeam,
    awayTeam,
    score,
    prediction,
    meta,
    points,
    progress,
    isLocked,
    deadlineAt,
    kickoffAt
  });

  return (
    <article
      className={`w-full rounded-2xl border p-3 ${
        isLive
          ? "border-[rgba(116,226,122,0.35)] bg-[linear-gradient(160deg,rgba(116,226,122,0.08)_0%,var(--bg-surface-1)_70%)]"
          : "border-[var(--border-subtle)] bg-[var(--bg-surface-1)]"
      }`}
    >
      <div className="flex flex-col gap-3">
        <header className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold ${
              isLive
                ? "border-[rgba(116,226,122,0.35)] bg-[rgba(116,226,122,0.14)] text-[var(--success)]"
                : isUpcoming
                  ? "border-[var(--border-subtle)] bg-[var(--bg-surface-2)] text-[var(--text-secondary)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-surface-2)] text-[var(--text-secondary)]"
            }`}
          >
            {isUpcoming ? <Clock3 size={12} /> : null}
            {statusLabel}
          </span>

          <div className="flex items-center gap-2">
            {isUpcoming && isLocked ? (
              <span className="inline-flex min-h-7 items-center gap-1 rounded-full border border-[rgba(255,180,84,0.4)] bg-[rgba(255,180,84,0.14)] px-2 text-[10px] font-semibold text-[var(--warning)]">
                <Lock size={11} />
                Bloqueado
              </span>
            ) : null}

            {points ? (
              <span
                className="inline-flex min-h-7 items-center gap-1 rounded-full border px-[10px] py-[3px]"
                style={{ backgroundColor: tone.badgeBg, borderColor: tone.badgeBorder }}
              >
                {isFinal ? <Check size={12} style={{ color: tone.text }} /> : null}
                <span className="text-[10px] font-semibold" style={{ color: tone.text }}>
                  +{points.value}
                  {isFinal ? "" : " pts"}
                </span>
              </span>
            ) : null}
          </div>
        </header>

        <div className="flex items-center justify-between gap-2">
          <TeamBadge code={homeTeam.code} logoUrl={homeTeam.logoUrl} align="left" compact={isFinal || isUpcoming} tiny={isFinal} />

          {isUpcoming && showPredictionStepper && stepper ? (
            <div className="flex items-center gap-2.5">
              <PredictionStepper
                value={stepper.homeValue}
                onIncrement={stepper.onHomeIncrement}
                onDecrement={stepper.onHomeDecrement}
                min={stepper.min}
                max={stepper.max}
                disabled={stepper.disabled}
              />
              <PredictionStepper
                value={stepper.awayValue}
                onIncrement={stepper.onAwayIncrement}
                onDecrement={stepper.onAwayDecrement}
                min={stepper.min}
                max={stepper.max}
                disabled={stepper.disabled}
              />
            </div>
          ) : isUpcoming && predictionBox ? (
            <button
              type="button"
              onClick={predictionBox.onClick}
              disabled={predictionBox.disabled}
              className={`flex min-h-12 min-w-[108px] items-center justify-center rounded-xl border px-2 text-[28px] leading-none font-black tracking-tighter disabled:opacity-50 ${
                predictionBox.highlighted
                  ? "border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-primary)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-surface-2)] text-[var(--text-primary)]"
              }`}
              aria-label="Editar pronóstico"
            >
              <span>{predictionBox.homeValue === null ? "-" : predictionBox.homeValue}</span>
              <span className="px-1 text-[12px] text-[var(--text-secondary)]">-</span>
              <span>{predictionBox.awayValue === null ? "-" : predictionBox.awayValue}</span>
            </button>
          ) : score ? (
            <ScoreCenter home={score.home} away={score.away} prediction={prediction} />
          ) : (
            <div className="h-12 w-[108px] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-2)]" />
          )}

          <TeamBadge code={awayTeam.code} logoUrl={awayTeam.logoUrl} align="right" compact={isFinal || isUpcoming} tiny={isFinal} />
        </div>

        {deadlineAt || kickoffAt ? (
          <p className="text-[10px] text-[var(--text-secondary)]">
            {deadlineAt ? `Cierre: ${new Date(deadlineAt).toLocaleString("es-AR")}` : null}
            {!deadlineAt && kickoffAt ? `Comienza: ${new Date(kickoffAt).toLocaleString("es-AR")}` : null}
          </p>
        ) : null}

        {typeof progress === "number" ? (
          <div className="h-1.5 w-full rounded-full bg-[var(--bg-surface-2)]">
            <div className="h-1.5 rounded-full bg-[var(--accent-primary)]" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
          </div>
        ) : null}
      </div>
    </article>
  );
}
