import { db } from "./client.ts";

export async function seed(): Promise<void> {
  const usersCount = await db.query.users?.findMany();
  void usersCount;
}

if (import.meta.main) {
  await seed();
}

