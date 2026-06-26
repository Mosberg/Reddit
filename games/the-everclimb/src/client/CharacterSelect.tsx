import type { CharacterId } from '../shared/types';
import { characters } from '../shared/types';

type CharacterSelectProps = {
  selected: CharacterId;
  onSelect: (id: CharacterId) => void;
  disabled?: boolean;
};

export const CharacterSelect = ({ selected, onSelect, disabled }: CharacterSelectProps) => {
  return (
    <section className="rounded-2xl border border-white/30 bg-white/70 p-3 backdrop-blur-sm">
      <h3 className="mb-2 text-sm font-semibold tracking-wide text-slate-700">Character</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {characters.map((character) => {
          const active = selected === character.id;
          return (
            <button
              key={character.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(character.id)}
              className={`rounded-xl border px-2 py-2 text-left transition ${
                active
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500'
              }`}
            >
              <div className="text-xs font-semibold">{character.name}</div>
              <div className="text-[10px] opacity-80">{character.blurb}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
