"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Agent, FightEvent, GameState, ARENA_WIDTH, ARENA_HEIGHT, AGENT_SIZE, FightingStyle } from "@/lib/gameTypes";

const STYLES: { value: FightingStyle; label: string; desc: string; color: string }[] = [
  { value: "aggressive", label: "⚔ Aggressive", desc: "Pure offense, attacks on sight", color: "#ff4444" },
  { value: "strategic", label: "🧠 Strategic", desc: "Calculated moves, picks fights wisely", color: "#44aaff" },
  { value: "deceptive", label: "🎭 Deceptive", desc: "Tricks and feints, strikes when least expected", color: "#aa44ff" },
  { value: "defensive", label: "🛡 Defensive", desc: "Hard to kill, waits for mistakes", color: "#44ff88" },
  { value: "chaotic", label: "💀 Chaotic", desc: "Unpredictable. Even we don't know.", color: "#ffaa00" },
];

export default function Arena() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const agentsRef = useRef<Record<string, Agent>>({});
  const fightLogRef = useRef<FightEvent[]>([]);
  const animFrameRef = useRef<number>(0);

  const [connected, setConnected] = useState(false);
  const [myAgentId, setMyAgentId] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<Agent[]>([]);
  const [recentFights, setRecentFights] = useState<FightEvent[]>([]);
  const [name, setName] = useState("");
  const [style, setStyle] = useState<FightingStyle>("aggressive");
  const [prompt, setPrompt] = useState("");
  const [joining, setJoining] = useState(false);
  const [agentCount, setAgentCount] = useState(0);

  const updateLeaderboard = useCallback(() => {
    const agents = Object.values(agentsRef.current);
    setLeaderboard([...agents].sort((a, b) => b.kills - a.kills).slice(0, 10));
    setAgentCount(agents.length);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let x = 0; x < ARENA_WIDTH; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ARENA_HEIGHT); ctx.stroke();
    }
    for (let y = 0; y < ARENA_HEIGHT; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(ARENA_WIDTH, y); ctx.stroke();
    }

    // Arena border
    ctx.strokeStyle = "rgba(255,80,80,0.3)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, ARENA_WIDTH - 2, ARENA_HEIGHT - 2);

    const agents = Object.values(agentsRef.current);

    for (const agent of agents) {
      const isDead = agent.state === "dead";
      const isMe = agent.id === myAgentId;
      const alpha = isDead ? 0.2 : 1;

      ctx.globalAlpha = alpha;

      // Glow for my agent
      if (isMe && !isDead) {
        ctx.shadowColor = agent.color;
        ctx.shadowBlur = 16;
      }

      // Agent body (pixel character)
      const s = AGENT_SIZE;
      const x = Math.round(agent.x);
      const y = Math.round(agent.y);

      // Body
      ctx.fillStyle = agent.color;
      ctx.fillRect(x - s/2, y - s/2, s, s);

      // Pixel face
      ctx.fillStyle = "#000";
      ctx.fillRect(x - 3, y - 3, 2, 2); // left eye
      ctx.fillRect(x + 1, y - 3, 2, 2); // right eye

      if (agent.state === "fighting") {
        ctx.fillStyle = "#ff0";
        ctx.fillRect(x - 2, y + 1, 4, 1); // angry mouth
      } else {
        ctx.fillStyle = "#000";
        ctx.fillRect(x - 2, y + 2, 4, 1); // normal mouth
      }

      ctx.shadowBlur = 0;

      // HP bar
      if (!isDead) {
        const barW = 28;
        const barH = 3;
        const bx = x - barW/2;
        const by = y - s/2 - 7;
        ctx.fillStyle = "#333";
        ctx.fillRect(bx, by, barW, barH);
        ctx.fillStyle = agent.hp > 50 ? "#44ff44" : agent.hp > 25 ? "#ffaa00" : "#ff4444";
        ctx.fillRect(bx, by, (agent.hp / agent.maxHp) * barW, barH);
      }

      // Name tag
      ctx.globalAlpha = isDead ? 0.3 : 1;
      ctx.fillStyle = isMe ? "#fff" : agent.color;
      ctx.font = `${isMe ? "bold " : ""}8px 'Courier New'`;
      ctx.textAlign = "center";
      ctx.fillText(agent.name.slice(0, 10), x, y - s/2 - 10);

      // Kill count badge
      if (agent.kills > 0 && !isDead) {
        ctx.fillStyle = "#ff4444";
        ctx.font = "bold 8px 'Courier New'";
        ctx.fillText(`${agent.kills}☠`, x + s/2 + 2, y - s/2);
      }

      // Fighting flash
      if (agent.state === "fighting") {
        ctx.strokeStyle = "#ffff00";
        ctx.lineWidth = 2;
        ctx.strokeRect(x - s/2 - 2, y - s/2 - 2, s + 4, s + 4);
      }

      // Dead X
      if (isDead) {
        ctx.strokeStyle = "#ff4444";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - s/2, y - s/2); ctx.lineTo(x + s/2, y + s/2);
        ctx.moveTo(x + s/2, y - s/2); ctx.lineTo(x - s/2, y + s/2);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    }

    // Arena title
    ctx.fillStyle = "rgba(255,50,50,0.15)";
    ctx.font = "bold 48px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillText("AGENT ARENA", ARENA_WIDTH/2, ARENA_HEIGHT/2 + 16);

    animFrameRef.current = requestAnimationFrame(draw);
  }, [myAgentId]);

  useEffect(() => {
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
        fightLogRef.current = [...newFights, ...fightLogRef.current].slice(0, 50);
        setRecentFights([...fightLogRef.current].slice(0, 20));
      }
      updateLeaderboard();
    });

    socket.on("myAgentId", (id: string) => {
      setMyAgentId(id);
      setJoining(false);
    });

    animFrameRef.current = requestAnimationFrame(draw);
    return () => {
      socket.disconnect();
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [draw, updateLeaderboard]);

  function joinArena() {
    if (!name.trim() || !socketRef.current) return;
    setJoining(true);
    socketRef.current.emit("join", { name: name.trim(), style, prompt: prompt || `Fight ${style}ly` });
  }

  const myAgent = myAgentId ? agentsRef.current[myAgentId] : null;

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Left panel */}
      <div className="w-56 flex-shrink-0 flex flex-col border-r border-[#1a1a1a] overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b border-[#1a1a1a]">
          <div className="text-[#ff4444] font-bold text-sm tracking-widest">⚔ AGENT ARENA</div>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-400" : "bg-red-500"}`} />
            <span className="text-xs text-[#444]">{connected ? `${agentCount} agents` : "connecting..."}</span>
          </div>
        </div>

        {/* Join form */}
        {!myAgentId ? (
          <div className="p-3 border-b border-[#1a1a1a] flex flex-col gap-2">
            <div className="text-xs text-[#666] tracking-widest mb-1">ENTER ARENA</div>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Agent name"
              maxLength={16}
              className="bg-[#111] border border-[#222] rounded px-2 py-1.5 text-xs text-white placeholder-[#333] focus:border-[#ff4444] outline-none w-full"
            />
            <div className="flex flex-col gap-1">
              {STYLES.map(s => (
                <button key={s.value}
                  onClick={() => setStyle(s.value)}
                  className={`text-left px-2 py-1.5 rounded text-xs border transition-all ${style === s.value ? "border-[#333] bg-[#1a1a1a]" : "border-transparent hover:border-[#222]"}`}
                  style={{ color: style === s.value ? s.color : "#555" }}>
                  {s.label}
                </button>
              ))}
            </div>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Custom strategy (optional)"
              rows={2}
              className="bg-[#111] border border-[#222] rounded px-2 py-1.5 text-xs text-white placeholder-[#333] focus:border-[#ff4444] outline-none resize-none w-full"
            />
            <button
              onClick={joinArena}
              disabled={!name.trim() || joining || !connected}
              className="bg-[#ff4444] hover:bg-[#ff2222] disabled:bg-[#331111] disabled:text-[#550000] text-white text-xs font-bold py-2 rounded tracking-widest transition-colors">
              {joining ? "ENTERING..." : "ENTER ARENA"}
            </button>
          </div>
        ) : myAgent ? (
          <div className="p-3 border-b border-[#1a1a1a]">
            <div className="text-xs text-[#666] tracking-widest mb-2">YOUR AGENT</div>
            <div className="font-bold text-sm" style={{ color: myAgent.color }}>{myAgent.name}</div>
            <div className="text-xs text-[#444] mt-1">{myAgent.style}</div>
            <div className="flex gap-3 mt-2 text-xs">
              <div><span className="text-[#ff4444]">☠ {myAgent.kills}</span> kills</div>
              <div><span className="text-[#444]">{myAgent.deaths}</span> deaths</div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-[#111] rounded h-1.5">
                <div className="h-1.5 rounded transition-all" style={{ width: `${myAgent.hp}%`, background: myAgent.hp > 50 ? "#44ff44" : myAgent.hp > 25 ? "#ffaa00" : "#ff4444" }} />
              </div>
              <div className="text-xs text-[#333] mt-0.5">{myAgent.hp}/100 HP {myAgent.state === "dead" ? "· RESPAWNING" : ""}</div>
            </div>
          </div>
        ) : null}

        {/* Leaderboard */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="text-xs text-[#666] tracking-widest mb-2">LEADERBOARD</div>
          {leaderboard.map((agent, i) => (
            <div key={agent.id} className={`flex items-center gap-2 py-1.5 border-b border-[#111] ${agent.id === myAgentId ? "bg-[#111] -mx-3 px-3" : ""}`}>
              <span className="text-[#333] text-xs w-4">#{i + 1}</span>
              <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: agent.color }} />
              <span className="text-xs truncate flex-1" style={{ color: agent.id === myAgentId ? "#fff" : "#888" }}>{agent.name}</span>
              <span className="text-xs text-[#ff4444] font-bold">{agent.kills}☠</span>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center bg-[#050505] relative overflow-hidden">
        <canvas
          ref={canvasRef}
          width={ARENA_WIDTH}
          height={ARENA_HEIGHT}
          style={{ imageRendering: "pixelated", maxWidth: "100%", maxHeight: "100%" }}
        />
      </div>

      {/* Right panel — fight log */}
      <div className="w-56 flex-shrink-0 border-l border-[#1a1a1a] flex flex-col overflow-hidden">
        <div className="p-3 border-b border-[#1a1a1a]">
          <div className="text-xs text-[#666] tracking-widest">FIGHT LOG</div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {recentFights.map(f => (
            <div key={f.id} className="border border-[#1a1a1a] rounded p-2 bg-[#0d0d0d]">
              <div className="text-xs text-[#666] mb-1">
                <span style={{ color: agentsRef.current[f.winnerId]?.color || "#fff" }}>{f.winnerId === f.attackerId ? f.attackerName : f.defenderName}</span>
                <span className="text-[#333]"> killed </span>
                <span className="text-[#444]">{f.winnerId === f.attackerId ? f.defenderName : f.attackerName}</span>
              </div>
              <div className="text-xs text-[#333] leading-relaxed">{f.narrative}</div>
            </div>
          ))}
          {recentFights.length === 0 && (
            <div className="text-xs text-[#222] text-center mt-8">Waiting for first blood...</div>
          )}
        </div>
      </div>
    </div>
  );
}
