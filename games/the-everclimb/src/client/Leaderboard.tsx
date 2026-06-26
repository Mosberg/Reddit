import type { GameMode, LeaderboardEntry } from '../shared/types';

type LeaderboardProps = {
  mode: GameMode;
  rows: LeaderboardEntry[];
  activeUsername: string | null;
  loading?: boolean;
};

export const Leaderboard = ({
  mode,
  rows,
  activeUsername,
  loading,
}: LeaderboardProps) => {
  return (
    <section className="rounded-2xl border border-slate-300 bg-white/80 p-3 backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          {mode.toUpperCase()} Leaderboard
        </h3>
        {loading ? (
          <span className="text-xs text-slate-500">Loading...</span>
        ) : null}
      </div>

      <ol className="space-y-1 text-xs text-slate-700">
        {rows.length === 0 ? (
          <li className="rounded-lg bg-slate-100 px-2 py-2">No runs yet.</li>
        ) : null}
        {rows.map((row, index) => {
          const mine = activeUsername === row.username;
          return (
            <li
              key={`${row.userId}-${row.createdAt}-${index}`}
              className={`grid grid-cols-[24px_1fr_auto] items-center gap-2 rounded-lg px-2 py-1 ${
                mine ? 'bg-emerald-100' : 'bg-slate-100'
              }`}
            >
              <span className="font-semibold">{index + 1}</span>
              <span className="truncate">
                {row.username} • F{row.floor} • C{row.combo}
              </span>
              <span className="font-semibold">
                {row.score.toLocaleString()}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
};
