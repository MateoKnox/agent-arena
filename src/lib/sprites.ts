// T = transparent
const T = "transparent";

// Color palettes
const W = { // Warrior - red/brown
  armor: "#8B2500", armLight: "#C43000", metal: "#666", metLight: "#999",
  skin: "#F4A460", eye: "#FF0000", sword: "#C0C0C0", swordHilt: "#FFD700",
  blood: "#8B0000", shadow: "#3D1000",
};
const M = { // Mage - purple
  robe: "#4B0082", robeLight: "#7B2FBE", hat: "#2D0057", staff: "#8B4513",
  orb: "#00FFFF", skin: "#FFD9B3", eye: "#FF00FF", stars: "#FFD700",
  glow: "#9B59B6", shadow: "#1A0030",
};
const R = { // Rogue - dark green
  hood: "#1B3A1B", cloak: "#2D5A2D", dagger: "#C0C0C0", leather: "#3D2B14",
  skin: "#D2B48C", eye: "#00FF00", blade: "#E8E8E8", shadow: "#0A150A",
  buckle: "#FFD700",
};
const P = { // Paladin - gold/white
  armor: "#DAA520", armLight: "#FFD700", white: "#FFFFF0", shield: "#B8860B",
  skin: "#FFDAB9", eye: "#4169E1", glow: "#FFFACD", holy: "#FFFFE0",
  shadow: "#5A4500",
};
const V = { // Void - black/cyan
  body: "#0A0A0F", dark: "#050508", cyan: "#00FFFF", cyanDim: "#006666",
  eye: "#00FFFF", glow: "#004444", purple: "#1A0030", spark: "#FF00FF",
  white: "#CCFFFF", shadow: "#000000",
};

export type CharClass = "WARRIOR" | "MAGE" | "ROGUE" | "PALADIN" | "VOID";

type Frame = string[][];

export interface SpriteData {
  idle: Frame;
  walk1: Frame;
  walk2: Frame;
  attack: Frame;
  death: Frame;
  color: string;
}

// 16x16 pixel art frames
const WARRIOR_IDLE: Frame = [
  [T,T,T,T,T,W.metal,W.metal,W.metal,W.metal,T,T,T,T,T,T,T],
  [T,T,T,T,W.metal,W.armLight,W.armLight,W.armLight,W.armLight,W.metal,T,T,T,T,T,T],
  [T,T,T,W.metal,W.armLight,W.skin,W.skin,W.skin,W.skin,W.armLight,W.metal,T,T,T,T,T],
  [T,T,T,W.metal,W.armLight,W.eye,W.skin,W.skin,W.eye,W.armLight,W.metal,T,T,T,T,T],
  [T,T,T,W.metal,W.armLight,W.skin,W.skin,W.skin,W.skin,W.armLight,W.metal,T,T,T,T,T],
  [T,T,T,T,W.armor,W.armor,W.armor,W.armor,W.armor,W.armor,T,T,T,T,T,T],
  [T,T,W.sword,W.armor,W.armLight,W.armLight,W.armLight,W.armLight,W.armor,W.armor,T,T,T,T,T,T],
  [T,T,W.sword,W.armor,W.armLight,W.armLight,W.armLight,W.armLight,W.armor,W.armor,T,T,T,T,T,T],
  [T,T,W.sword,W.armor,W.armLight,W.armLight,W.armLight,W.armLight,W.armor,W.armor,T,T,T,T,T,T],
  [T,T,W.swordHilt,W.armor,W.armor,W.armor,W.armor,W.armor,W.armor,W.armor,T,T,T,T,T,T],
  [T,T,T,W.armor,W.armor,W.armor,T,T,W.armor,W.armor,T,T,T,T,T,T],
  [T,T,T,W.armor,W.armor,W.armor,T,T,W.armor,W.armor,T,T,T,T,T,T],
  [T,T,T,W.armor,W.armor,W.armor,T,T,W.armor,W.armor,T,T,T,T,T,T],
  [T,T,T,W.armor,W.armor,T,T,T,T,W.armor,T,T,T,T,T,T],
  [T,T,T,W.metal,W.metal,T,T,T,T,W.metal,T,T,T,T,T,T],
  [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],
];

const MAGE_IDLE: Frame = [
  [T,T,T,T,T,M.hat,M.hat,M.hat,M.hat,T,T,T,T,T,T,T],
  [T,T,T,T,M.hat,M.hat,M.hat,M.hat,M.hat,M.hat,T,T,T,T,T,T],
  [T,T,T,M.hat,M.robeLight,M.robeLight,M.hat,M.hat,M.robeLight,M.hat,M.hat,T,T,T,T,T],
  [T,T,T,T,M.robe,M.skin,M.skin,M.skin,M.skin,M.robe,T,T,T,T,T,T],
  [T,T,T,T,M.robe,M.eye,M.skin,M.skin,M.eye,M.robe,T,T,T,T,T,T],
  [T,T,T,T,M.robe,M.skin,M.skin,M.skin,M.skin,M.robe,T,T,T,T,T,T],
  [T,M.staff,T,M.robe,M.robeLight,M.robeLight,M.robeLight,M.robeLight,M.robe,T,T,T,T,T,T,T],
  [T,M.staff,T,M.robe,M.robeLight,M.robeLight,M.robeLight,M.robeLight,M.robe,T,T,T,T,T,T,T],
  [T,M.staff,T,M.robe,M.robeLight,M.stars,M.robeLight,M.robeLight,M.robe,T,T,T,T,T,T,T],
  [T,M.orb,T,M.robe,M.robe,M.robe,M.robe,M.robe,M.robe,T,T,T,T,T,T,T],
  [T,T,T,M.robe,M.robe,T,T,T,M.robe,M.robe,T,T,T,T,T,T],
  [T,T,T,M.robe,M.robe,T,T,T,M.robe,M.robe,T,T,T,T,T,T],
  [T,T,T,M.robe,M.robe,T,T,T,M.robe,M.robe,T,T,T,T,T,T],
  [T,T,T,M.robe,M.shadow,T,T,T,M.shadow,M.robe,T,T,T,T,T,T],
  [T,T,T,M.shadow,T,T,T,T,T,M.shadow,T,T,T,T,T,T],
  [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],
];

const ROGUE_IDLE: Frame = [
  [T,T,T,T,T,R.hood,R.hood,R.hood,R.hood,T,T,T,T,T,T,T],
  [T,T,T,T,R.hood,R.hood,R.hood,R.hood,R.hood,R.hood,T,T,T,T,T,T],
  [T,T,T,R.hood,R.cloak,R.skin,R.skin,R.skin,R.cloak,R.hood,T,T,T,T,T,T],
  [T,T,T,R.hood,R.cloak,R.eye,R.skin,R.skin,R.cloak,R.hood,T,T,T,T,T,T],
  [T,T,T,R.hood,R.cloak,R.skin,R.skin,R.skin,R.cloak,R.hood,T,T,T,T,T,T],
  [T,T,T,T,R.leather,R.leather,R.leather,R.leather,R.leather,T,T,T,T,T,T,T],
  [T,R.dagger,T,R.cloak,R.leather,R.leather,R.leather,R.leather,R.cloak,T,R.dagger,T,T,T,T,T],
  [T,R.blade,T,R.cloak,R.leather,R.leather,R.leather,R.leather,R.cloak,T,R.blade,T,T,T,T,T],
  [T,R.blade,T,R.cloak,R.leather,R.leather,R.leather,R.leather,R.cloak,T,R.blade,T,T,T,T,T],
  [T,T,T,R.cloak,R.cloak,R.cloak,R.cloak,R.cloak,R.cloak,T,T,T,T,T,T,T],
  [T,T,T,R.cloak,R.cloak,T,T,T,R.cloak,R.cloak,T,T,T,T,T,T],
  [T,T,T,R.cloak,R.cloak,T,T,T,R.cloak,R.cloak,T,T,T,T,T,T],
  [T,T,T,R.cloak,R.cloak,T,T,T,R.cloak,R.cloak,T,T,T,T,T,T],
  [T,T,T,R.leather,R.leather,T,T,T,R.leather,R.leather,T,T,T,T,T,T],
  [T,T,T,R.shadow,R.shadow,T,T,T,R.shadow,R.shadow,T,T,T,T,T,T],
  [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],
];

const PALADIN_IDLE: Frame = [
  [T,T,T,T,T,P.armLight,P.armLight,P.armLight,T,T,T,T,T,T,T,T],
  [T,T,T,T,P.armor,P.armLight,P.glow,P.armLight,P.armor,T,T,T,T,T,T,T],
  [T,T,T,P.armor,P.armLight,P.skin,P.skin,P.skin,P.armLight,P.armor,T,T,T,T,T,T],
  [T,T,T,P.armor,P.armLight,P.eye,P.skin,P.eye,P.armLight,P.armor,T,T,T,T,T,T],
  [T,T,T,P.armor,P.armLight,P.skin,P.skin,P.skin,P.armLight,P.armor,T,T,T,T,T,T],
  [T,T,T,T,P.armor,P.armor,P.armor,P.armor,P.armor,T,T,T,T,T,T,T],
  [T,P.shield,P.shield,P.armor,P.armLight,P.armLight,P.armLight,P.armor,T,T,T,T,T,T,T,T],
  [T,P.shield,P.glow,P.armor,P.armLight,P.armLight,P.armLight,P.armor,T,T,T,T,T,T,T,T],
  [T,P.shield,P.shield,P.armor,P.armLight,P.glow,P.armLight,P.armor,T,T,T,T,T,T,T,T],
  [T,T,T,P.armor,P.armor,P.armor,P.armor,P.armor,T,T,T,T,T,T,T,T],
  [T,T,T,P.armor,P.armor,T,T,P.armor,P.armor,T,T,T,T,T,T,T],
  [T,T,T,P.armor,P.armor,T,T,P.armor,P.armor,T,T,T,T,T,T,T],
  [T,T,T,P.armor,P.armor,T,T,P.armor,P.armor,T,T,T,T,T,T,T],
  [T,T,T,P.armor,P.armor,T,T,P.armor,P.armor,T,T,T,T,T,T,T],
  [T,T,T,P.shadow,P.shadow,T,T,P.shadow,P.shadow,T,T,T,T,T,T,T],
  [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],
];

const VOID_IDLE: Frame = [
  [T,T,T,T,T,V.purple,V.dark,V.dark,V.purple,T,T,T,T,T,T,T],
  [T,T,T,T,V.glow,V.body,V.dark,V.dark,V.body,V.glow,T,T,T,T,T,T],
  [T,T,T,V.glow,V.body,V.body,V.dark,V.dark,V.body,V.body,V.glow,T,T,T,T,T],
  [T,T,T,V.dark,V.body,V.cyan,V.body,V.body,V.cyan,V.body,V.dark,T,T,T,T,T],
  [T,T,T,V.dark,V.body,V.body,V.body,V.body,V.body,V.body,V.dark,T,T,T,T,T],
  [T,T,T,T,V.body,V.body,V.body,V.body,V.body,V.body,T,T,T,T,T,T],
  [T,T,V.spark,V.purple,V.body,V.body,V.body,V.body,V.purple,T,V.spark,T,T,T,T,T],
  [T,T,T,V.body,V.cyanDim,V.body,V.body,V.body,V.body,V.body,T,T,T,T,T,T],
  [T,T,T,V.body,V.body,V.body,V.body,V.body,V.body,V.body,T,T,T,T,T,T],
  [T,T,T,V.body,V.body,V.body,V.body,V.body,V.body,V.body,T,T,T,T,T,T],
  [T,T,T,V.dark,V.dark,T,T,T,V.dark,V.dark,T,T,T,T,T,T],
  [T,T,V.cyan,V.dark,V.dark,T,T,T,V.dark,V.dark,V.cyan,T,T,T,T,T],
  [T,T,T,V.dark,V.dark,T,T,T,V.dark,V.dark,T,T,T,T,T,T],
  [T,T,T,V.body,V.glow,T,T,T,V.glow,V.body,T,T,T,T,T,T],
  [T,T,T,V.shadow,T,T,T,T,T,V.shadow,T,T,T,T,T,T],
  [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],
];

// Walk frames - slightly shifted legs
function makeWalk1(idle: Frame, legColor: string): Frame {
  return idle.map((row, y) => {
    if (y >= 10 && y <= 13) return row.map((p, x) => {
      if (x >= 3 && x <= 5 && p !== T) return legColor;
      return p;
    });
    return row;
  });
}

function makeWalk2(idle: Frame, legColor: string): Frame {
  return idle.map((row, y) => {
    if (y >= 10 && y <= 13) return row.map((p, x) => {
      if (x >= 7 && x <= 9 && p !== T) return legColor;
      return p;
    });
    return row;
  });
}

// Attack frame - arms raised
function makeAttack(idle: Frame, weaponColor: string): Frame {
  return idle.map((row, y) => {
    if (y === 5 || y === 6) return row.map((p, x) => {
      if (x <= 2) return weaponColor;
      return p;
    });
    return row;
  });
}

// Death frame - tilted
function makeDeath(idle: Frame): Frame {
  return idle.map((row, y) => row.map((p) => p !== T ? "#441111" : T));
}

export const SPRITES: Record<CharClass, SpriteData> = {
  WARRIOR: {
    idle: WARRIOR_IDLE,
    walk1: makeWalk1(WARRIOR_IDLE, W.armor),
    walk2: makeWalk2(WARRIOR_IDLE, W.armor),
    attack: makeAttack(WARRIOR_IDLE, W.sword),
    death: makeDeath(WARRIOR_IDLE),
    color: "#C43000",
  },
  MAGE: {
    idle: MAGE_IDLE,
    walk1: makeWalk1(MAGE_IDLE, M.robe),
    walk2: makeWalk2(MAGE_IDLE, M.robe),
    attack: makeAttack(MAGE_IDLE, M.orb),
    death: makeDeath(MAGE_IDLE),
    color: "#7B2FBE",
  },
  ROGUE: {
    idle: ROGUE_IDLE,
    walk1: makeWalk1(ROGUE_IDLE, R.cloak),
    walk2: makeWalk2(ROGUE_IDLE, R.cloak),
    attack: makeAttack(ROGUE_IDLE, R.dagger),
    death: makeDeath(ROGUE_IDLE),
    color: "#2D5A2D",
  },
  PALADIN: {
    idle: PALADIN_IDLE,
    walk1: makeWalk1(PALADIN_IDLE, P.armor),
    walk2: makeWalk2(PALADIN_IDLE, P.armor),
    attack: makeAttack(PALADIN_IDLE, P.glow),
    death: makeDeath(PALADIN_IDLE),
    color: "#DAA520",
  },
  VOID: {
    idle: VOID_IDLE,
    walk1: makeWalk1(VOID_IDLE, V.body),
    walk2: makeWalk2(VOID_IDLE, V.body),
    attack: makeAttack(VOID_IDLE, V.cyan),
    death: makeDeath(VOID_IDLE),
    color: "#00CCCC",
  },
};

export function getCharacterClass(style: string): CharClass {
  const map: Record<string, CharClass> = {
    aggressive: "WARRIOR",
    strategic: "MAGE",
    deceptive: "ROGUE",
    defensive: "PALADIN",
    chaotic: "VOID",
  };
  return map[style] || "WARRIOR";
}

export function drawSprite(ctx: CanvasRenderingContext2D, frame: Frame, x: number, y: number, scale = 3, flipX = false) {
  const size = 16;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const color = frame[row]?.[col];
      if (!color || color === "transparent") continue;
      const px = flipX ? x + (size - 1 - col) * scale : x + col * scale;
      const py = y + row * scale;
      ctx.fillStyle = color;
      ctx.fillRect(px, py, scale, scale);
    }
  }
}
