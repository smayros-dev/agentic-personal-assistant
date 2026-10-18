import "dotenv/config";
import { createApp } from "./app.js";

const PORT = process.env.PORT || 3001;

createApp().listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
