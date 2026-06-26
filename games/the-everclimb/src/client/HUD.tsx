import type { GameMode } from '../shared/types';

type HUDProps = {
  mode: GameMode;
  score: number;
  floor: number;
  combo: number;
  comboTimer: number;
  comboText: string | null;
  risingProgress: number;
  timeLeft: number | null;
  modeCompleted: boolean;
};

export const HUD = ({
  mode,
  score,
  floor,
  combo,
  comboTimer,
  comboText,
  risingProgress,
  timeLeft,
  modeCompleted,
}: HUDProps) => {
  const comboPct = Math.max(0, Math.min(comboTimer / 2.1, 1)) * 100;
  const risingPct = Math.max(0, Math.min(risingProgress, 1)) * 100;

  return (
    <section className="rounded-2xl border border-cyan-200/20 bg-slate-950/65 p-3 text-cyan-50 shadow-lg backdrop-blur-sm">
      <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm">
        <div>
          <div className="opacity-70">Floor</div>
          <div className="text-xl font-bold text-cyan-100">{floor}</div>
        </div>
        <div>
          <div className="opacity-70">Score</div>
          <div className="text-xl font-bold text-cyan-100">
            {score.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="opacity-70">Combo</div>
          <div className="text-xl font-bold text-cyan-100">x{combo}</div>
        </div>
      </div>

      <div className="mt-2 space-y-2">
        <div>
          <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wide opacity-80">
            <span>Combo Window</span>
            <span>{comboTimer.toFixed(1)}s</span>
          </div>
          <div className="h-2 rounded-full bg-black/30">
            <div
              className="h-2 rounded-full bg-amber-300 transition-all"
              style={{ width: `${comboPct}%` }}
            />
          </div>
        </div>

        <div>
          <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wide opacity-80">
            <span>Rising Void</span>
            <span>{Math.round(risingPct)}%</span>
          </div>
          <div className="h-2 rounded-full bg-black/30">
            <div
              className="h-2 rounded-full bg-sky-400 transition-all"
              style={{ width: `${risingPct}%` }}
            />
          </div>
        </div>

        {mode === 'timeattack' && timeLeft !== null ? (
          <div className="text-right text-xs font-semibold tracking-wide text-cyan-200">
            Time Left: {timeLeft.toFixed(1)}s
          </div>
        ) : null}

        {comboText ? (
          <div className="text-right text-xs font-bold tracking-wide text-amber-200">
            {comboText}
          </div>
        ) : null}

        {modeCompleted ? (
          <div className="text-right text-xs font-bold tracking-wide text-emerald-200">
            Challenge Complete
          </div>
        ) : null}
      </div>
    </section>
  );
};
