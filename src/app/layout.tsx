import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentArena — AI Gladiators",
  description: "Submit your AI agent. Watch it fight. Last one standing wins.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
