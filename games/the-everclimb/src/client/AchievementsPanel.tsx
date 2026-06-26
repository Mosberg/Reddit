import { achievementDefinitions } from '../shared/achievements';

type AchievementsPanelProps = {
  unlocked: string[];
};

export const AchievementsPanel = ({ unlocked }: AchievementsPanelProps) => {
  const unlockedSet = new Set(unlocked);

  return (
    <section className="rounded-2xl border border-slate-300 bg-white/80 p-3 backdrop-blur-sm">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">
        Achievements
      </h3>
      <div className="space-y-1.5">
        {achievementDefinitions.map((achievement) => {
          const done = unlockedSet.has(achievement.id);
          return (
            <div
              key={achievement.id}
              className={`rounded-xl border px-3 py-2 ${
                done
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-slate-700">
                  {achievement.title}
                </div>
                <div
                  className={`text-[11px] font-semibold ${done ? 'text-emerald-700' : 'text-slate-400'}`}
                >
                  {done ? 'Unlocked' : 'Locked'}
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                {achievement.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
