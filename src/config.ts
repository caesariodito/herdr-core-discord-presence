export function clientId(): string {
  const id = process.env.DISCORD_CLIENT_ID ?? "";
  if (!/^\d{17,20}$/.test(id)) throw new Error("DISCORD_CLIENT_ID must be a Discord application ID");
  return id;
}
