import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * `/compatibility-test` became `/match`. Invite and pair links are handed out
   * to real people and live on in their chat history, so the old paths keep
   * resolving forever. `:path*` matches zero or more segments, covering the bare
   * route and every child; query values ride along, which is what preserves the
   * `?share=` token on a pair link.
   */
  async redirects() {
    return [
      {
        source: "/compatibility-test/:path*",
        destination: "/match/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
