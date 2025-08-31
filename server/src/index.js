// server/src/index.js
import { createApp } from "./app.js";

const app = createApp();
const PORT = Number(process.env.PORT) || 5050;

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});

// Optional: basic process guards
process.on("unhandledRejection", (err) => {
  console.error("[unhandledRejection]", err);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
});
