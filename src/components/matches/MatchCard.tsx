"use client";

import Image from "next/image";
import { Check, Clock3, Shield, TrendingUp } from "lucide-react";
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
  textTone = "white",
  tiny = false
}: {
  code: string;
  logoUrl?: string;
  align?: "left" | "right";
  compact?: boolean;
  textTone?: "white" | "primary";
  tiny?: boolean;
}) {
  const textColor = textTone === "primary" ? "text-[var(--text-primary)]" : "text-white";
  const avatarSize = tiny ? "h-8 w-8" : "h-9 w-9";
  const shieldSize = tiny ? 18 : 20;
  const shieldOffset = tiny ? "left-[7px] top-[7px]" : "left-2 top-2";

  return (
    <div
      className={`flex ${align === "right" ? "justify-end" : "justify-start"} ${compact ? "w-[100px]" : "w-[110px]"} items-center ${tiny ? "gap-2" : "gap-2.5"}`}
    >
      {align === "right" ? (
        <p className={`font-team text-[26px] font-black ${textColor}`}>
          {code}
        </p>
      ) : null}
      <div className={`relative ${avatarSize} flex items-center justify-center`}>
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={`${code} logo`}
            fill
            unoptimized
            sizes={tiny ? "32px" : "36px"}
            className="absolute inset-0 object-contain p-[2px]"
          />
        ) : (
          <Shield size={shieldSize} className={`absolute ${shieldOffset} text-[var(--border-light)]`} />
        )}
      </div>
      {align === "left" ? (
        <p className={`font-team text-[26px] font-extrabold ${textColor}`}>
          {code}
        </p>
      ) : null}
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
      <div className="flex items-center gap-2 font-mono">
        <span className="text-2xl font-bold text-white">{home}</span>
        <span className="text-sm text-[var(--text-tertiary)]">-</span>
        <span className="text-2xl font-bold text-white">{away}</span>
      </div>
      {prediction ? (
        <p className="text-[9px] font-bold tracking-[0.5px] text-[var(--text-tertiary)]">
          TU PRODE: {prediction.home}-{prediction.away}
        </p>
      ) : null}
    </div>
  );
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
  predictionBox
}: MatchCardProps) {
  const isLive = status === "live";
  const isUpcoming = status === "upcoming";
  const isFinal = status === "final";
  const isCompactTeams = isUpcoming;
  const teamTextTone = isLive ? "white" : "primary";
  const isTinyFinalTeams = isFinal;

  const tone = points ? pointsToneColors[points.tone] : pointsToneColors.neutral;

  return (
    <article
      className={`w-full rounded-[6px] border p-[6px_8px_14px_8px] ${
        isLive
          ? "border-[#324429] bg-[#0b0d09]"
          : isUpcoming
            ? "border-[#4c4c55] bg-[#0b0b0d]"
            : "border-[#373740] bg-[#0a0a0b]"
      }`}
    >
      <div className="flex flex-col gap-3">
        <header className="flex items-center justify-between">
          {isLive ? (
            <span className="flex items-center gap-2 rounded-full border border-[#304122] bg-[#11180b] px-2 py-[3px]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#9dbb72]" />
              <span className="font-mono text-[11px] font-semibold tracking-[0.5px] text-[#b7cf92]">{meta.label}</span>
            </span>
          ) : null}

          {isUpcoming ? (
            <span className="flex items-center gap-1.5 rounded-full border border-[#5c5c66] bg-[#18181c] px-2 py-[3px]">
              <Clock3 size={12} className="text-[var(--text-secondary)]" />
              <span className="font-mono text-[11px] font-bold tracking-normal text-white">{meta.label}</span>
            </span>
          ) : null}

          {isFinal ? (
            <span className="text-[10px] font-semibold tracking-[1.5px] text-[#9f9fa8]">{meta.label}</span>
          ) : null}

          {points ? (
            <span
              className="flex items-center gap-1 rounded-full border px-[10px] py-[3px]"
              style={{ backgroundColor: tone.badgeBg, borderColor: tone.badgeBorder }}
            >
              {isFinal ? (
                <Check size={12} style={{ color: tone.text }} />
              ) : (
                <TrendingUp size={12} style={{ color: tone.text }} />
              )}
              <span className={`text-[10px] ${isFinal ? "font-medium font-mono" : "font-bold"}`} style={{ color: tone.text }}>
                +{points.value}
                {isFinal ? "" : " pts"}
              </span>
            </span>
          ) : null}
        </header>

        <div className="flex items-center justify-between">
          <TeamBadge
            code={homeTeam.code}
            logoUrl={homeTeam.logoUrl}
            align="left"
            compact={isCompactTeams || isFinal}
            textTone={teamTextTone}
            tiny={isTinyFinalTeams}
          />

          {isUpcoming && showPredictionStepper && stepper ? (
            <div className="flex items-center gap-2.5">
              <PredictionStepper
                value={stepper.homeValue}
                onIncrement={stepper.onHomeIncrement}
                onDecrement={stepper.onHomeDecrement}
                min={stepper.min}
                max={stepper.max}
              />
              <PredictionStepper
                value={stepper.awayValue}
                onIncrement={stepper.onAwayIncrement}
                onDecrement={stepper.onAwayDecrement}
                min={stepper.min}
                max={stepper.max}
              />
            </div>
          ) : isUpcoming && predictionBox ? (
            <button
              type="button"
              onClick={predictionBox.onClick}
              disabled={predictionBox.disabled}
              className={`flex min-w-[92px] items-center justify-center rounded-[6px] border px-2 py-2 font-mono text-[17px] font-bold transition-opacity hover:opacity-95 disabled:opacity-50 ${
                predictionBox.highlighted
                  ? "border-[var(--accent)] bg-[rgba(153,204,0,0.12)] text-[var(--accent)]"
                  : "border-[var(--border-light)] bg-black text-white"
              }`}
              aria-label="Editar pronóstico"
            >
              <span>{predictionBox.homeValue === null ? "-" : predictionBox.homeValue}</span>
              <span className="px-1 text-[11px] text-[var(--text-secondary)]">-</span>
              <span>{predictionBox.awayValue === null ? "-" : predictionBox.awayValue}</span>
            </button>
          ) : score ? (
            <ScoreCenter home={score.home} away={score.away} prediction={prediction} />
          ) : null}

          <TeamBadge
            code={awayTeam.code}
            logoUrl={awayTeam.logoUrl}
            align="right"
            compact={isCompactTeams || isFinal}
            textTone={teamTextTone}
            tiny={isTinyFinalTeams}
          />
        </div>

        {typeof progress === "number" ? (
          <div className="h-0.5 w-full rounded-[6px] bg-[var(--bg-surface-elevated)]">
            <div className="h-0.5 rounded-[6px] bg-[var(--accent)]" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
          </div>
        ) : null}
      </div>
    </article>
  );
}
