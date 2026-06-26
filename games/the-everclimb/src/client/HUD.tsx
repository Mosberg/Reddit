import type { GameMode } from '../shared/types';

type HUDProps = {
  mode: GameMode;
  score: number;
  floor: number;
  combo: number;
  comboTimer: number;
  risingProgress: number;
  timeLeft: number | null;
};

export const HUD = ({ mode, score, floor, combo, comboTimer, risingProgress, timeLeft }: HUDProps) => {
  const comboPct = Math.max(0, Math.min(comboTimer / 2.1, 1)) * 100;
  const risingPct = Math.max(0, Math.min(risingProgress, 1)) * 100;

  return (
    <section className="rounded-2xl border border-white/25 bg-black/45 p-3 text-white shadow-lg">
      <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm">
        <div>
          <div className="opacity-70">Floor</div>
          <div className="text-xl font-bold">{floor}</div>
        </div>
        <div>
          <div className="opacity-70">Score</div>
          <div className="text-xl font-bold">{score.toLocaleString()}</div>
        </div>
        <div>
          <div className="opacity-70">Combo</div>
          <div className="text-xl font-bold">x{combo}</div>
        </div>
      </div>

      <div className="mt-2 space-y-2">
        <div>
          <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wide opacity-80">
            <span>Combo Window</span>
            <span>{comboTimer.toFixed(1)}s</span>
          </div>
          <div className="h-2 rounded-full bg-white/20">
            <div className="h-2 rounded-full bg-amber-400 transition-all" style={{ width: `${comboPct}%` }} />
          </div>
        </div>

        <div>
          <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wide opacity-80">
            <span>Rising Void</span>
            <span>{Math.round(risingPct)}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/20">
            <div className="h-2 rounded-full bg-rose-400 transition-all" style={{ width: `${risingPct}%` }} />
          </div>
        </div>

        {mode === 'timeattack' && timeLeft !== null ? (
          <div className="text-right text-xs font-semibold tracking-wide text-cyan-200">
            Time Left: {timeLeft.toFixed(1)}s
          </div>
        ) : null}
      </div>
    </section>
  );
};
