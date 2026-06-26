import './index.css';

import { requestExpandedMode, context } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

export const Splash = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_20%_20%,#fff4d0_0%,#ffe0b3_35%,#86d6ff_100%)] p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/50 bg-white/70 p-6 text-slate-900 shadow-2xl backdrop-blur-sm">
        <h1 className="text-3xl font-black tracking-tight">The Everclimb</h1>
        <p className="mt-2 text-sm text-slate-700">
          Welcome {context.username ?? 'climber'}. Scale the Skybound Spiral, stack combos, and stay ahead of the Rising Pulse.
        </p>
        <button
          className="mt-5 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          onClick={(event) => requestExpandedMode(event.nativeEvent, 'game')}
        >
          Enter The Everclimb
        </button>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
