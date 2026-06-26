export type PlatformKind = 'stone' | 'ice' | 'wood';

export type Platform = {
  id: number;
  x: number;
  y: number;
  width: number;
  kind: PlatformKind;
};

export type PlayerBody = {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
};

export const worldConfig = {
  arenaWidth: 420,
  viewportHeight: 640,
  gravity: 2400,
  moveSpeed: 230,
  airMoveSpeed: 180,
  accel: 1700,
  airAccel: 1000,
  friction: 1800,
  coyoteWindow: 0.12,
  jumpVelocity: -700,
  edgeTolerance: 8,
  maxFallSpeed: 1200,
};

export const platformFriction: Record<PlatformKind, number> = {
  stone: 1,
  wood: 0.9,
  ice: 0.65,
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

export const approach = (value: number, target: number, delta: number): number => {
  if (value < target) {
    return Math.min(value + delta, target);
  }
  return Math.max(value - delta, target);
};

export const computeHorizontalVelocity = (
  currentVx: number,
  inputAxis: number,
  grounded: boolean,
  surfaceFriction: number,
  dt: number
): number => {
  const speed = grounded ? worldConfig.moveSpeed : worldConfig.airMoveSpeed;
  const accel = grounded ? worldConfig.accel : worldConfig.airAccel;

  if (inputAxis !== 0) {
    const target = inputAxis * speed;
    return approach(currentVx, target, accel * dt * surfaceFriction);
  }

  const friction = grounded ? worldConfig.friction * surfaceFriction : worldConfig.friction * 0.2;
  return approach(currentVx, 0, friction * dt);
};

export const computeJumpVelocity = (runSpeed: number): number => {
  const bonus = Math.min(Math.abs(runSpeed) / worldConfig.moveSpeed, 1) * 90;
  return worldConfig.jumpVelocity - bonus;
};

export const applyGravity = (currentVy: number, dt: number): number => {
  return clamp(currentVy + worldConfig.gravity * dt, -1600, worldConfig.maxFallSpeed);
};

export const platformColor = (kind: PlatformKind): string => {
  switch (kind) {
    case 'stone':
      return '#8f7d71';
    case 'ice':
      return '#7ecbe6';
    case 'wood':
      return '#a37042';
    default:
      return '#8f7d71';
  }
};
