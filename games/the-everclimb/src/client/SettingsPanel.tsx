import { useEffect, useState } from 'react';
import type { GameSettings, KeyAction } from '../shared/types';

type SettingsPanelProps = {
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  onResetData: () => void;
};

const settingsRows: Array<{
  key:
    | 'soundEnabled'
    | 'screenShakeEnabled'
    | 'comboTextEnabled'
    | 'tutorialHintsEnabled'
    | 'showGhostRuns';
  title: string;
  description: string;
}> = [
  {
    key: 'soundEnabled',
    title: 'Sound Effects',
    description: 'Enable jump, land, and combo sound cues.',
  },
  {
    key: 'screenShakeEnabled',
    title: 'Screen Shake',
    description: 'Add impact shake for high combo landings.',
  },
  {
    key: 'comboTextEnabled',
    title: 'Combo Text',
    description: 'Show combo callouts like Super and Amazing.',
  },
  {
    key: 'tutorialHintsEnabled',
    title: 'Tutorial Hints',
    description: 'Display onboarding hints during a run.',
  },
  {
    key: 'showGhostRuns',
    title: 'Ghost Runs',
    description: 'Reserved for future replay ghost visualization.',
  },
];

export const SettingsPanel = ({
  settings,
  onChange,
  onResetData,
}: SettingsPanelProps) => {
  const [awaitingAction, setAwaitingAction] = useState<KeyAction | null>(null);

  useEffect(() => {
    if (!awaitingAction) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      event.preventDefault();
      onChange({
        ...settings,
        keybindings: {
          ...settings.keybindings,
          [awaitingAction]: event.code,
        },
      });
      setAwaitingAction(null);
    };

    window.addEventListener('keydown', onKeyDown, { once: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [awaitingAction, onChange, settings]);

  return (
    <section className="rounded-2xl border border-slate-300 bg-white/80 p-3 backdrop-blur-sm">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">Settings</h3>
      <div className="space-y-2">
        {settingsRows.map((row) => (
          <label
            key={row.key}
            className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
          >
            <span>
              <span className="block text-xs font-semibold text-slate-700">
                {row.title}
              </span>
              <span className="block text-[11px] text-slate-500">
                {row.description}
              </span>
            </span>
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4"
              checked={settings[row.key]}
              onChange={(event) => {
                onChange({
                  ...settings,
                  [row.key]: event.target.checked,
                });
              }}
            />
          </label>
        ))}

        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <div className="mb-1 text-xs font-semibold text-slate-700">
            Input Mapping
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(['left', 'right', 'jump', 'pause', 'run'] as KeyAction[]).map(
              (action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => setAwaitingAction(action)}
                  className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-left font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {action.toUpperCase()}:{' '}
                  {awaitingAction === action
                    ? 'Press key...'
                    : settings.keybindings[action]}
                </button>
              )
            )}
          </div>
        </div>

        <label className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <span>
            <span className="block text-xs font-semibold text-slate-700">
              Gamepad Input
            </span>
            <span className="block text-[11px] text-slate-500">
              Enable polling for left stick and face button jump.
            </span>
          </span>
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4"
            checked={settings.gamepadEnabled}
            onChange={(event) => {
              onChange({
                ...settings,
                gamepadEnabled: event.target.checked,
              });
            }}
          />
        </label>

        <label className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <span className="block text-xs font-semibold text-slate-700">
            Gamepad Deadzone: {settings.gamepadDeadzone.toFixed(2)}
          </span>
          <input
            type="range"
            min={0.05}
            max={0.5}
            step={0.01}
            value={settings.gamepadDeadzone}
            className="mt-1 w-full"
            onChange={(event) => {
              onChange({
                ...settings,
                gamepadDeadzone: Number(event.target.value),
              });
            }}
          />
        </label>

        <button
          type="button"
          onClick={onResetData}
          className="w-full rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500"
        >
          Reset All Data
        </button>
      </div>
    </section>
  );
};
