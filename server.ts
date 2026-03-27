import { createServer } from "http";
import { Server } from "socket.io";
import { GameState } from "./src/lib/gameTypes";
import { createAgent, tickAgents } from "./src/lib/gameEngine";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

const state: GameState = {
  agents: {},
  fightLog: [],
  tick: 0,
};

// Seed some default agents
const defaultAgents = [
  { name: "GladiatorX", style: "aggressive", prompt: "Fight with maximum aggression" },
  { name: "ShadowFox", style: "deceptive", prompt: "Use cunning and deception" },
  { name: "IronWall", style: "defensive", prompt: "Outlast all opponents" },
  { name: "Mastermind", style: "strategic", prompt: "Always think three moves ahead" },
  { name: "WildCard", style: "chaotic", prompt: "Pure chaos, no rules" },
];

for (const a of defaultAgents) {
  const agent = createAgent(a.name, a.style, a.prompt);
  state.agents[agent.id] = agent;
}

io.on("connection", (socket) => {
  // Send full state on connect
  socket.emit("state", state);

  socket.on("join", ({ name, style, prompt }: { name: string; style: string; prompt: string }) => {
    if (Object.keys(state.agents).length >= 30) {
      socket.emit("error", "Arena is full (max 30 agents)");
      return;
    }
    const agent = createAgent(name || "Agent", style || "aggressive", prompt || "Fight to win");
    state.agents[agent.id] = agent;
    io.emit("agentJoined", agent);
    socket.emit("myAgentId", agent.id);
  });
});

// Game loop — tick every 100ms
setInterval(() => {
  const { newFights } = tickAgents(state);
  io.emit("tick", {
    agents: state.agents,
    newFights,
    tick: state.tick,
  });
}, 100);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Game server running on port ${PORT}`);
});
