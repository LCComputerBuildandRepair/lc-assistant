import type { NextConfig } from "next";

// Serve the marketing website (static HTML in public/) at clean URLs, alongside
// the assistant app (dashboard, /book, /quote, /widget) and the /api routes.
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/", destination: "/index.html" },
      { source: "/repair", destination: "/repair.html" },
      { source: "/websites", destination: "/websites.html" },
      { source: "/homecalls", destination: "/homecalls.html" },
      { source: "/commercial", destination: "/commercial.html" },
      { source: "/gallery", destination: "/gallery.html" },
    ];
  },
};

export default nextConfig;
