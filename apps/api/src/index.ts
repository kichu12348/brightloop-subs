import { buildApp } from "./app.ts";
import { env } from "./config/env.ts";

const app = await buildApp();

try {
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  console.log("server running");
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
