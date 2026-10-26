import "dotenv/config";
import express from "express";
import { runSupportAgent } from "./agent.js";

const app = express();

app.use(express.json());

app.post("/chat", async (req, res) => {
  try {
    const { message, previousInteractionId = null } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "A valid message is required.",
      });
    }

    const result = await runSupportAgent({
      message,
      previousInteractionId,
    });

    res.json(result);
  } catch (error) {
    console.error("Chat error:", error);

    res.status(500).json({
      error: "Failed to process the message.",
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
