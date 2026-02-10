export interface WeaponDef {
  id: string;
  name: string;            // display name for lobby
  fireRate: number;        // ticks between shots
  bulletSpeed: number;     // px/s
  bulletTTL: number;       // ticks
  bulletDamage: number;
  projectileCount: number; // 1 = single, 3+ = spread
  spreadAngle: number;     // radians total arc, 0 = single line
  pierceCount: number;     // 0 = destroyed on first hit, N = passes through N entities
}
