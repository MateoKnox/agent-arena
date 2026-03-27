"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Agent, FightEvent, GameState, ARENA_WIDTH, ARENA_HEIGHT, FightingStyle } from "@/lib/gameTypes";
import { SPRITES, getCharacterClass, drawSprite, CharClass } from "@/lib/sprites";

const SCALE = 3;
const SPRITE_PX = 16 * SCALE;

const STYLE_OPTIONS: { value: FightingStyle; label: string; charClass: CharClass; desc: string }[] = [
  { value: "aggressive", label: "WARRIOR", charClass: "WARRIOR", desc: "Pure offense" },
  { value: "strategic",  label: "MAGE",    charClass: "MAGE",    desc: "Calculated strikes" },
  { value: "deceptive",  label: "ROGUE",   charClass: "ROGUE",   desc: "Strike from shadows" },
  { value: "defensive",  label: "PALADIN", charClass: "PALADIN", desc: "Unbreakable defense" },
  { value: "chaotic",    label: "VOID",    charClass: "VOID",    desc: "Pure chaos" },
];

interface BloodSplat { x: number; y: number; pixels: {dx: number; dy: number; color: string}[]; alpha: number; }
interface ClashEffect { x: number; y: number; frame: number; }

// Pre-render sprite frames to offscreen canvases for perf
function prerenderSprites() {
  const cache: Record<string, HTMLCanvasElement> = {};
  for (const [cls, data] of Object.entries(SPRITES)) {
    for (const [frameName, frame] of Object.entries(data)) {
      if (!Array.isArray(frame)) continue;
      const key = `${cls}_${frameName}`;
      const c = document.createElement("canvas");
      c.width = SPRITE_PX; c.height = SPRITE_PX;
      const ctx = c.getContext("2d")!;
      drawSprite(ctx, frame as string[][], 0, 0, SCALE);
      cache[key] = c;

      // Flipped
      const cf = document.createElement("canvas");
      cf.width = SPRITE_PX; cf.height = SPRITE_PX;
      const ctxf = cf.getContext("2d")!;
      drawSprite(ctxf, frame as string[][], 0, 0, SCALE, true);
      cache[`${key}_flip`] = cf;
    }
  }
  return cache;
}

export default function Arena() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const agentsRef = useRef<Record<string, Agent>>({});
  const fightLogRef = useRef<FightEvent[]>([]);
  const animRef = useRef<number>(0);
  const tickRef = useRef(0);
  const spriteCache = useRef<Record<string, HTMLCanvasElement>>({});
  const bloodSplats = useRef<BloodSplat[]>([]);
  const clashEffects = useRef<ClashEffect[]>([]);
  const torchPhase = useRef(0);

  const [connected, setConnected] = useState(false);
  const [myAgentId, setMyAgentId] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<Agent[]>([]);
  const [recentFights, setRecentFights] = useState<FightEvent[]>([]);
  const [name, setName] = useState("");
  const [style, setStyle] = useState<FightingStyle>("aggressive");
  const [joining, setJoining] = useState(false);
  const [agentCount, setAgentCount] = useState(0);
  const [totalKills, setTotalKills] = useState(0);

  const updateLeaderboard = useCallback(() => {
    const agents = Object.values(agentsRef.current);
    setLeaderboard([...agents].sort((a, b) => b.kills - a.kills).slice(0, 10));
    setAgentCount(agents.length);
    setTotalKills(agents.reduce((s, a) => s + a.kills, 0));
  }, []);

  const drawArena = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    tickRef.current++;
    torchPhase.current += 0.08;
    const t = torchPhase.current;

    // === FLOOR ===
    for (let tx = 0; tx < ARENA_WIDTH; tx += 40) {
      for (let ty = 0; ty < ARENA_HEIGHT; ty += 40) {
        const checker = ((tx + ty) / 40) % 2 === 0;
        ctx.fillStyle = checker ? "#1a1a18" : "#141412";
        ctx.fillRect(tx, ty, 40, 40);
      }
    }

    // Floor cracks
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1;
    [[80,120,200,180],[300,50,350,150],[500,200,520,300],[700,100,680,250],
     [150,300,250,280],[400,350,450,400],[600,300,650,350]].forEach(([x1,y1,x2,y2]) => {
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    });

    // Arena border - stone wall effect
    ctx.strokeStyle = "#3d2b14";
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, ARENA_WIDTH - 6, ARENA_HEIGHT - 6);
    ctx.strokeStyle = "#5a3d1a";
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, ARENA_WIDTH - 16, ARENA_HEIGHT - 16);

    // === CROWD SILHOUETTES ===
    ctx.fillStyle = "rgba(10,8,5,0.7)";
    for (let cx = 0; cx < ARENA_WIDTH; cx += 18) {
      const h = 20 + Math.sin(cx * 0.3) * 8;
      ctx.fillRect(cx, 0, 16, h);
      ctx.fillRect(cx, ARENA_HEIGHT - h, 16, h);
    }
    for (let cy = 30; cy < ARENA_HEIGHT - 30; cy += 18) {
      const w = 15 + Math.sin(cy * 0.3) * 6;
      ctx.fillRect(0, cy, w, 16);
      ctx.fillRect(ARENA_WIDTH - w, cy, w, 16);
    }

    // === TORCHES (corners) ===
    const torchPositions = [[30, 30], [ARENA_WIDTH - 30, 30], [30, ARENA_HEIGHT - 30], [ARENA_WIDTH - 30, ARENA_HEIGHT - 30]];
    torchPositions.forEach(([tx2, ty2]) => {
      const flicker = 0.7 + Math.sin(t + tx2) * 0.3;
      // Glow
      const grad = ctx.createRadialGradient(tx2, ty2, 0, tx2, ty2, 35 * flicker);
      grad.addColorStop(0, `rgba(255,140,0,${0.4 * flicker})`);
      grad.addColorStop(1, "rgba(255,60,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(tx2 - 35, ty2 - 35, 70, 70);
      // Flame
      ctx.fillStyle = `rgba(255,${Math.floor(120 + Math.sin(t * 3) * 40)},0,${flicker})`;
      ctx.fillRect(tx2 - 3, ty2 - 8, 6, 8);
      ctx.fillStyle = `rgba(255,200,0,${flicker * 0.8})`;
      ctx.fillRect(tx2 - 2, ty2 - 10, 4, 6);
      // Torch body
      ctx.fillStyle = "#5a3000";
      ctx.fillRect(tx2 - 2, ty2, 4, 10);
    });

    // === BLOOD SPLATS ===
    bloodSplats.current = bloodSplats.current.filter(b => b.alpha > 0);
    bloodSplats.current.forEach(b => {
      b.alpha -= 0.005;
      ctx.globalAlpha = b.alpha;
      b.pixels.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(b.x + p.dx, b.y + p.dy, 3, 3);
      });
      ctx.globalAlpha = 1;
    });

    // === AGENTS ===
    const agents = Object.values(agentsRef.current);
    for (const agent of agents) {
      if (agent.state === "dead") continue;

      const cls = getCharacterClass(agent.style);
      const sprite = SPRITES[cls];
      const tick = tickRef.current;

      // Choose frame
      let frameName = "idle";
      if (agent.state === "fighting") frameName = "attack";
      else if (agent.state === "roaming") {
        frameName = Math.floor(tick / 8) % 2 === 0 ? "walk1" : "walk2";
      }

      const cacheKey = `${cls}_${frameName}`;
      const isMe = agent.id === myAgentId;

      // Facing direction
      const target = agent.targetId ? agentsRef.current[agent.targetId] : null;
      const facingLeft = target ? target.x < agent.x : false;
      const finalKey = facingLeft ? `${cacheKey}_flip` : cacheKey;

      const cached = spriteCache.current[finalKey];
      const drawX = agent.x - SPRITE_PX / 2;
      const drawY = agent.y - SPRITE_PX / 2;

      // My agent glow
      if (isMe) {
        ctx.shadowColor = sprite.color;
        ctx.shadowBlur = 12;
      }

      if (cached) {
        ctx.globalAlpha = 1;
        ctx.drawImage(cached, drawX, drawY);
      }
      ctx.shadowBlur = 0;

      // === HP BAR ===
      const barW = SPRITE_PX;
      const barH = 4;
      const bx = drawX;
      const by = drawY - 12;
      ctx.fillStyle = "#1a0000";
      ctx.fillRect(bx, by, barW, barH);
      const hpColor = agent.hp > 60 ? "#00cc44" : agent.hp > 30 ? "#ffaa00" : "#cc0000";
      ctx.fillStyle = hpColor;
      ctx.fillRect(bx, by, (agent.hp / agent.maxHp) * barW, barH);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, barW, barH);

      // === NAME TAG ===
      ctx.fillStyle = isMe ? "#ffffff" : "#e8d5a0";
      ctx.font = `6px 'Press Start 2P', monospace`;
      ctx.textAlign = "center";
      ctx.fillText(agent.name.slice(0, 8), agent.x, drawY - 15);

      // === KILL BADGE ===
      if (agent.kills > 0) {
        ctx.fillStyle = "#cc0000";
        ctx.font = `6px 'Press Start 2P', monospace`;
        ctx.textAlign = "left";
        ctx.fillText(`☠${agent.kills}`, drawX + SPRITE_PX + 1, drawY + 8);
      }
    }

    // === CLASH EFFECTS ===
    clashEffects.current = clashEffects.current.filter(e => e.frame < 20);
    clashEffects.current.forEach(e => {
      e.frame++;
      const progress = e.frame / 20;
      const radius = progress * 30;
      ctx.globalAlpha = 1 - progress;
      // Star burst
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const px = e.x + Math.cos(angle) * radius;
        const py = e.y + Math.sin(angle) * radius;
        ctx.fillStyle = e.frame < 5 ? "#ffffff" : "#ffaa00";
        ctx.fillRect(px - 2, py - 2, 4, 4);
      }
      ctx.globalAlpha = 1 - progress;
      ctx.fillStyle = "#ffff00";
      ctx.fillRect(e.x - 3, e.y - 3, 6, 6);
      ctx.globalAlpha = 1;
    });

    // Arena title watermark
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = "#ff8c00";
    ctx.font = "bold 60px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText("ARENA", ARENA_WIDTH / 2, ARENA_HEIGHT / 2 + 20);
    ctx.globalAlpha = 1;

    animRef.current = requestAnimationFrame(drawArena);
  }, [myAgentId]);

  useEffect(() => {
    spriteCache.current = prerenderSprites();
    const socket = io("http://localhost:3001");
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("state", (state: GameState) => {
      agentsRef.current = state.agents;
      fightLogRef.current = state.fightLog;
      setRecentFights([...state.fightLog].slice(0, 20));
      updateLeaderboard();
    });

    socket.on("tick", ({ agents, newFights }: { agents: Record<string, Agent>; newFights: FightEvent[] }) => {
      agentsRef.current = agents;
      if (newFights.length > 0) {
        // Add blood + clash effects
        newFights.forEach(f => {
          const loser = agents[f.winnerId === f.attackerId ? f.defenderId : f.attackerId];
          if (loser) {
            bloodSplats.current.push({
              x: loser.x, y: loser.y, alpha: 1,
              pixels: Array.from({ length: 20 }, () => ({
                dx: (Math.random() - 0.5) * 40,
                dy: (Math.random() - 0.5) * 40,
                color: Math.random() > 0.3 ? "#8b0000" : "#cc0000",
              })),
            });
            clashEffects.current.push({ x: loser.x, y: loser.y, frame: 0 });
          }
        });
        fightLogRef.current = [...newFights, ...fightLogRef.current].slice(0, 50);
        setRecentFights([...fightLogRef.current].slice(0, 20));
      }
      updateLeaderboard();
    });

    socket.on("myAgentId", (id: string) => {
      setMyAgentId(id);
      setJoining(false);
    });

    animRef.current = requestAnimationFrame(drawArena);
    return () => {
      socket.disconnect();
      cancelAnimationFrame(animRef.current);
    };
  }, [drawArena, updateLeaderboard]);

  function joinArena() {
    if (!name.trim() || !socketRef.current) return;
    setJoining(true);
    socketRef.current.emit("join", { name: name.trim(), style, prompt: `Fight as a ${style} ${getCharacterClass(style)}` });
  }

  const myAgent = myAgentId ? agentsRef.current[myAgentId] : null;
  const selectedStyle = STYLE_OPTIONS.find(s => s.value === style)!;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0d0b08", overflow: "hidden" }}>

      {/* TOP BAR */}
      <div style={{ background: "#1a1208", borderBottom: "2px solid #3d2b14", padding: "6px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ color: "#ff8c00", fontSize: "12px", letterSpacing: "4px" }}>⚔ AGENT ARENA</div>
        <div style={{ display: "flex", gap: 24, fontSize: "8px", color: "#7a6040" }}>
          <span>SEASON <span style={{ color: "#ff8c00" }}>1</span></span>
          <span>AGENTS: <span style={{ color: "#ffaa33" }}>{agentCount}</span></span>
          <span>TOTAL KILLS: <span style={{ color: "#cc2200" }}>{totalKills}</span></span>
          <span style={{ color: connected ? "#44ff44" : "#ff4444" }}>{connected ? "● LIVE" : "● OFFLINE"}</span>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* LEFT PANEL */}
        <div style={{ width: 220, flexShrink: 0, background: "#140f07", borderRight: "2px solid #3d2b14", display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Join / My Agent */}
          {!myAgentId ? (
            <div style={{ padding: 12, borderBottom: "2px solid #3d2b14" }}>
              <div style={{ color: "#ff8c00", fontSize: "8px", letterSpacing: "2px", marginBottom: 10 }}>ENTER THE ARENA</div>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name..."
                maxLength={12}
                className="pixel-input"
                style={{ marginBottom: 8 }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                {STYLE_OPTIONS.map(opt => {
                  const sp = SPRITES[opt.charClass];
                  return (
                    <button key={opt.value}
                      onClick={() => setStyle(opt.value)}
                      style={{
                        background: style === opt.value ? "#2d1f0e" : "transparent",
                        border: style === opt.value ? `1px solid ${sp.color}` : "1px solid #2d1f0e",
                        color: style === opt.value ? sp.color : "#5a4030",
                        padding: "5px 8px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: "7px",
                        fontFamily: "'Press Start 2P', monospace",
                        textAlign: "left",
                        transition: "all 0.1s",
                      }}>
                      <div style={{ width: 8, height: 8, background: sp.color, flexShrink: 0, boxShadow: style === opt.value ? `0 0 6px ${sp.color}` : "none" }} />
                      <div>
                        <div>{opt.label}</div>
                        <div style={{ color: "#3d2b14", fontSize: "6px" }}>{opt.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button
                className="pixel-btn"
                onClick={joinArena}
                disabled={!name.trim() || joining || !connected}
                style={{ width: "100%", fontSize: "7px" }}>
                {joining ? "ENTERING..." : "ENTER ARENA"}
              </button>
            </div>
          ) : myAgent ? (
            <div style={{ padding: 12, borderBottom: "2px solid #3d2b14" }}>
              <div style={{ color: "#ff8c00", fontSize: "8px", letterSpacing: "2px", marginBottom: 8 }}>YOUR FIGHTER</div>
              <div style={{ color: SPRITES[getCharacterClass(myAgent.style)].color, fontSize: "10px", marginBottom: 4 }}>{myAgent.name}</div>
              <div style={{ color: "#5a4030", fontSize: "7px", marginBottom: 8 }}>{getCharacterClass(myAgent.style)}</div>
              <div style={{ display: "flex", gap: 12, fontSize: "8px", marginBottom: 8 }}>
                <span style={{ color: "#cc2200" }}>☠ {myAgent.kills}</span>
                <span style={{ color: "#5a4030" }}>✝ {myAgent.deaths}</span>
                <span style={{ color: myAgent.kills + myAgent.deaths > 0 ? "#ffaa33" : "#5a4030" }}>
                  {myAgent.deaths > 0 ? (myAgent.kills / myAgent.deaths).toFixed(1) : myAgent.kills.toFixed(1)} K/D
                </span>
              </div>
              <div style={{ background: "#0d0b08", height: 6, width: "100%", border: "1px solid #2d1f0e" }}>
                <div style={{ height: "100%", background: myAgent.hp > 60 ? "#00cc44" : myAgent.hp > 30 ? "#ffaa00" : "#cc0000", width: `${myAgent.hp}%`, transition: "width 0.3s" }} />
              </div>
              <div style={{ color: "#3d2b14", fontSize: "6px", marginTop: 4 }}>
                {myAgent.state === "dead" ? "RESPAWNING..." : `${myAgent.hp}/100 HP`}
              </div>
            </div>
          ) : null}

          {/* Leaderboard */}
          <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
            <div style={{ color: "#ff8c00", fontSize: "7px", letterSpacing: "2px", marginBottom: 8 }}>LEADERBOARD</div>
            {leaderboard.map((agent, i) => {
              const cls = getCharacterClass(agent.style);
              const sp = SPRITES[cls];
              return (
                <div key={agent.id} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "4px 0",
                  borderBottom: "1px solid #1a1208",
                  background: agent.id === myAgentId ? "#1a1208" : "transparent",
                }}>
                  <span style={{ color: "#3d2b14", fontSize: "6px", width: 14 }}>#{i + 1}</span>
                  <div style={{ width: 6, height: 6, background: sp.color, flexShrink: 0, boxShadow: `0 0 4px ${sp.color}` }} />
                  <span style={{ fontSize: "6px", flex: 1, color: agent.id === myAgentId ? "#fff" : "#7a6040", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{agent.name}</span>
                  <span style={{ fontSize: "7px", color: "#cc2200", fontWeight: "bold" }}>☠{agent.kills}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ARENA CANVAS */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0806", overflow: "hidden" }}>
          <canvas
            ref={canvasRef}
            width={ARENA_WIDTH}
            height={ARENA_HEIGHT}
            style={{ imageRendering: "pixelated", maxWidth: "100%", maxHeight: "100%", border: "3px solid #3d2b14", boxShadow: "0 0 30px rgba(0,0,0,0.8)" }}
          />
        </div>

        {/* RIGHT PANEL - FIGHT LOG */}
        <div style={{ width: 220, flexShrink: 0, background: "#140f07", borderLeft: "2px solid #3d2b14", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: 12, borderBottom: "2px solid #3d2b14" }}>
            <div style={{ color: "#ff8c00", fontSize: "7px", letterSpacing: "2px" }}>⚔ KILL FEED</div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            {recentFights.map(f => {
              const winnerAgent = agentsRef.current[f.winnerId];
              const winnerCls = winnerAgent ? getCharacterClass(winnerAgent.style) : "WARRIOR";
              const winnerColor = SPRITES[winnerCls].color;
              return (
                <div key={f.id} style={{
                  background: "#0d0b08",
                  border: "1px solid #2d1f0e",
                  padding: "6px 8px",
                  fontSize: "6px",
                  lineHeight: "1.6",
                }}>
                  <div style={{ marginBottom: 3 }}>
                    <span style={{ color: winnerColor }}>{f.winnerId === f.attackerId ? f.attackerName : f.defenderName}</span>
                    <span style={{ color: "#cc0000" }}> ☠ </span>
                    <span style={{ color: "#5a4030" }}>{f.winnerId === f.attackerId ? f.defenderName : f.attackerName}</span>
                  </div>
                  <div style={{ color: "#3d2b14", fontStyle: "italic" }}>{f.narrative}</div>
                </div>
              );
            })}
            {recentFights.length === 0 && (
              <div style={{ color: "#2d1f0e", fontSize: "7px", textAlign: "center", marginTop: 30 }}>
                Waiting for<br />first blood...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
