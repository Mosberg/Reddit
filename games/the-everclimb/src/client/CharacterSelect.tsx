import type { CharacterId } from '../shared/types';
import { characters } from '../shared/types';

const shadeHex = (hex: string, delta: number): string => {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized, 16);
  const r = Math.max(0, Math.min(255, ((value >> 16) & 255) + delta));
  const g = Math.max(0, Math.min(255, ((value >> 8) & 255) + delta));
  const b = Math.max(0, Math.min(255, (value & 255) + delta));
  return `rgb(${r}, ${g}, ${b})`;
};

type CharacterSelectProps = {
  selected: CharacterId;
  onSelect: (id: CharacterId) => void;
  bestFloor: number;
  disabled?: boolean;
};

export const CharacterSelect = ({
  selected,
  onSelect,
  bestFloor,
  disabled,
}: CharacterSelectProps) => {
  return (
    <section className="rounded-2xl border border-cyan-100/40 bg-slate-900/70 p-3 backdrop-blur-sm">
      <h3 className="mb-2 text-sm font-semibold tracking-wide text-cyan-100">
        Character
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {characters.map((character) => {
          const active = selected === character.id;
          const locked = (character.unlockFloor ?? 0) > bestFloor;
          const body = character.accent;
          const belt = shadeHex(character.accent, 55);
          const band = shadeHex(character.accent, -60);
          return (
            <button
              key={character.id}
              type="button"
              disabled={disabled || locked}
              onClick={() => {
                if (!locked) {
                  onSelect(character.id);
                }
              }}
              className={`rounded-xl border px-2 py-2 text-left transition ${
                active
                  ? 'border-cyan-300 bg-sky-500/20 text-white shadow-[0_0_0_1px_rgba(125,211,252,0.3)]'
                  : locked
                    ? 'border-slate-700 bg-slate-950/70 text-slate-500'
                    : 'border-cyan-950/40 bg-slate-950/70 text-cyan-50 hover:border-cyan-300/70'
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <div className="text-xs font-semibold">{character.name}</div>
                {active ? (
                  <span className="rounded bg-cyan-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-cyan-200">
                    Selected
                  </span>
                ) : null}
              </div>
              <div className="mb-2 text-[10px] opacity-80">
                {character.blurb}
              </div>
              <div className="mb-2 rounded-lg border border-cyan-100/20 bg-slate-900/80 p-2">
                <div
                  className="mx-auto h-10 w-8"
                  style={{ backgroundColor: body }}
                >
                  <div
                    className="h-1.5 w-full"
                    style={{ backgroundColor: band }}
                  />
                  <div
                    className="mt-2 h-3 w-full"
                    style={{ backgroundColor: belt }}
                  />
                </div>
              </div>
              {locked ? (
                <div className="mt-1 text-[10px] font-semibold text-amber-200">
                  Unlock at floor {character.unlockFloor}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
};
