import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep dynamic site settings and route metadata in <head> for crawlers and audits.
  htmlLimitedBots: /.*/,
};

export default nextConfig;
