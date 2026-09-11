import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Disabled: this repo already has a hand-written CLAUDE.md (working
  // instructions for the project); don't let Next.js overwrite it.
  agentRules: false,
};

export default nextConfig;
