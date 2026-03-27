export type FightingStyle = "aggressive" | "strategic" | "deceptive" | "defensive" | "chaotic";

export interface Agent {
  id: string;
  name: string;
  style: FightingStyle;
  prompt: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  kills: number;
  deaths: number;
  state: "roaming" | "fighting" | "dead" | "respawning";
  targetId?: string;
  color: string;
  respawnAt?: number;
  lastFightAt?: number;
}

export interface FightEvent {
  id: string;
  attackerId: string;
  attackerName: string;
  defenderId: string;
  defenderName: string;
  winnerId: string;
  narrative: string;
  timestamp: number;
}

export interface GameState {
  agents: Record<string, Agent>;
  fightLog: FightEvent[];
  tick: number;
}

export const ARENA_WIDTH = 1200;
export const ARENA_HEIGHT = 800;
export const AGENT_SIZE = 14;
export const FIGHT_RANGE = 40;
export const RESPAWN_TIME = 5000;
export const MOVE_SPEED = 1.2;
export const FIGHT_COOLDOWN = 3000;
