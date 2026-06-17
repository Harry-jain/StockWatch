/**
 * Security headers are set centrally in middleware.ts (covers every route,
 * including dynamically-rendered API responses). Keeping a second copy here
 * risked the two definitions disagreeing on header order/values — removed
 * to avoid that drift.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {}

export default nextConfig
