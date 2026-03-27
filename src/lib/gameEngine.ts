import { Agent, FightEvent, GameState, ARENA_WIDTH, ARENA_HEIGHT, FIGHT_RANGE, RESPAWN_TIME, MOVE_SPEED, FIGHT_COOLDOWN, AGENT_SIZE } from "./gameTypes";
import { v4 as uuid } from "uuid";

const COLORS = ["#ff4444","#44aaff","#44ff88","#ffaa00","#ff44aa","#aa44ff","#00ffcc","#ff8844","#88ff44","#ff44ff"];
let colorIdx = 0;

export function createAgent(name: string, style: string, prompt: string): Agent {
  return {
    id: uuid(),
    name: name.slice(0, 16),
    style: style as any,
    prompt,
    x: Math.random() * (ARENA_WIDTH - 100) + 50,
    y: Math.random() * (ARENA_HEIGHT - 100) + 50,
    hp: 100,
    maxHp: 100,
    kills: 0,
    deaths: 0,
    state: "roaming",
    color: COLORS[colorIdx++ % COLORS.length],
  };
}

export function tickAgents(state: GameState): { newFights: FightEvent[] } {
  const agents = Object.values(state.agents);
  const now = Date.now();
  const newFights: FightEvent[] = [];

  // Respawn dead agents
  for (const agent of agents) {
    if (agent.state === "dead" && agent.respawnAt && now >= agent.respawnAt) {
      agent.state = "roaming";
      agent.hp = agent.maxHp;
      agent.x = Math.random() * (ARENA_WIDTH - 100) + 50;
      agent.y = Math.random() * (ARENA_HEIGHT - 100) + 50;
      agent.targetId = undefined;
    }
  }

  const alive = agents.filter(a => a.state !== "dead");

  // Find targets and move
  for (const agent of alive) {
    if (agent.state === "dead") continue;

    // Find nearest enemy
    let nearest: Agent | null = null;
    let nearestDist = Infinity;
    for (const other of alive) {
      if (other.id === agent.id) continue;
      const dx = other.x - agent.x;
      const dy = other.y - agent.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = other;
      }
    }

    if (!nearest) continue;
    agent.targetId = nearest.id;

    // Move toward target
    const dx = nearest.x - agent.x;
    const dy = nearest.y - agent.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > FIGHT_RANGE) {
      agent.x += (dx / dist) * MOVE_SPEED;
      agent.y += (dy / dist) * MOVE_SPEED;
      agent.x = Math.max(AGENT_SIZE, Math.min(ARENA_WIDTH - AGENT_SIZE, agent.x));
      agent.y = Math.max(AGENT_SIZE, Math.min(ARENA_HEIGHT - AGENT_SIZE, agent.y));
      agent.state = "roaming";
    }
  }

  // Check for fights
  const fought = new Set<string>();
  for (const agent of alive) {
    if (fought.has(agent.id) || agent.state === "dead") continue;
    if (agent.lastFightAt && now - agent.lastFightAt < FIGHT_COOLDOWN) continue;

    const target = agent.targetId ? state.agents[agent.targetId] : null;
    if (!target || target.state === "dead") continue;
    if (fought.has(target.id)) continue;
    if (target.lastFightAt && now - target.lastFightAt < FIGHT_COOLDOWN) continue;

    const dx = target.x - agent.x;
    const dy = target.y - agent.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= FIGHT_RANGE) {
      // Resolve fight based on styles
      const winner = resolveFight(agent, target);
      const loser = winner.id === agent.id ? target : agent;

      loser.hp = 0;
      loser.state = "dead";
      loser.deaths++;
      loser.respawnAt = now + RESPAWN_TIME;
      winner.kills++;
      winner.state = "roaming";

      agent.lastFightAt = now;
      target.lastFightAt = now;
      fought.add(agent.id);
      fought.add(target.id);

      const fight: FightEvent = {
        id: uuid(),
        attackerId: agent.id,
        attackerName: agent.name,
        defenderId: target.id,
        defenderName: target.name,
        winnerId: winner.id,
        narrative: generateNarrative(winner, loser),
        timestamp: now,
      };

      newFights.push(fight);
      state.fightLog = [fight, ...state.fightLog].slice(0, 50);
    }
  }

  state.tick++;
  return { newFights };
}

function resolveFight(a: Agent, b: Agent): Agent {
  // Style matchup matrix
  const styleScore: Record<string, Record<string, number>> = {
    aggressive: { defensive: 0.35, strategic: 0.45, deceptive: 0.6, chaotic: 0.55, aggressive: 0.5 },
    strategic: { aggressive: 0.55, defensive: 0.6, deceptive: 0.45, chaotic: 0.5, strategic: 0.5 },
    deceptive: { aggressive: 0.4, strategic: 0.55, defensive: 0.6, chaotic: 0.5, deceptive: 0.5 },
    defensive: { aggressive: 0.65, deceptive: 0.4, strategic: 0.4, chaotic: 0.55, defensive: 0.5 },
    chaotic: { aggressive: 0.45, strategic: 0.5, deceptive: 0.5, defensive: 0.45, chaotic: 0.5 },
  };

  const aWinChance = styleScore[a.style]?.[b.style] ?? 0.5;
  return Math.random() < aWinChance ? a : b;
}

function generateNarrative(winner: Agent, loser: Agent): string {
  const narratives: Record<string, string[]> = {
    aggressive: [
      `{w} charged at {l} with reckless fury and crushed them.`,
      `{w} overwhelmed {l} with relentless aggression.`,
      `{w} bulldozed through {l}'s defenses.`,
    ],
    strategic: [
      `{w} outmaneuvered {l} with a calculated flanking move.`,
      `{w} predicted {l}'s every move and exploited the weakness.`,
      `{w} laid a perfect trap and {l} walked right into it.`,
    ],
    deceptive: [
      `{w} faked a retreat then struck {l} from behind.`,
      `{w} tricked {l} into lowering their guard, then struck.`,
      `{l} trusted {w}. That was the last mistake they made.`,
    ],
    defensive: [
      `{w} weathered everything {l} threw, then counterattacked perfectly.`,
      `{w} held the line and waited for {l} to make a mistake.`,
      `{l} exhausted themselves against {w}'s iron defense.`,
    ],
    chaotic: [
      `Nobody knows what {w} did, but {l} is dead.`,
      `{w} did something completely unpredictable and it worked.`,
      `{l} had no idea what was happening. Neither did {w}. {w} won.`,
    ],
  };

  const pool = narratives[winner.style] || narratives.aggressive;
  const template = pool[Math.floor(Math.random() * pool.length)];
  return template.replace(/{w}/g, winner.name).replace(/{l}/g, loser.name);
}
