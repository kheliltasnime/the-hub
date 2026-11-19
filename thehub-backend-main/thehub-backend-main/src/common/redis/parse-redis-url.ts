export function parseRedisUrl(redisUrl: string) {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password || undefined,
    // BullMQ recommande explicitement ce réglage pour ses connexions internes
    maxRetriesPerRequest: null as any,
  };
}