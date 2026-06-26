import type { PlayerProfile } from '../shared/types';

type ProfileStatsProps = {
  profile: PlayerProfile | null;
};

export const ProfileStats = ({ profile }: ProfileStatsProps) => {
  if (!profile) {
    return (
      <section className="rounded-2xl border border-slate-300 bg-white/80 p-3 backdrop-blur-sm">
        <h3 className="text-sm font-semibold text-slate-700">Profile Stats</h3>
        <p className="text-xs text-slate-500">Loading stats...</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-300 bg-white/80 p-3 backdrop-blur-sm">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">
        Profile Stats
      </h3>
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
        <div className="rounded-lg bg-slate-100 px-2 py-1.5">
          Best Floor: {profile.bestFloor}
        </div>
        <div className="rounded-lg bg-slate-100 px-2 py-1.5">
          Best Score: {profile.bestScore.toLocaleString()}
        </div>
        <div className="rounded-lg bg-slate-100 px-2 py-1.5">
          Best Combo: {profile.bestCombo}
        </div>
        <div className="rounded-lg bg-slate-100 px-2 py-1.5">
          Runs Played: {profile.runsPlayed}
        </div>
        <div className="rounded-lg bg-slate-100 px-2 py-1.5">
          Total Floors: {profile.totalFloors.toLocaleString()}
        </div>
        <div className="rounded-lg bg-slate-100 px-2 py-1.5">
          Total Score: {profile.totalScore.toLocaleString()}
        </div>
      </div>
    </section>
  );
};
