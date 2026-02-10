export interface WeaponDef {
  id: string;
  fireRate: number;        // ticks between shots
  bulletSpeed: number;     // px/s
  bulletTTL: number;       // ticks
  bulletDamage: number;
  projectileCount: number; // 1 = single, 3+ = spread
  spreadAngle: number;     // radians total arc, 0 = single line
}
