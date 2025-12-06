// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();

/**
 * ✅ CORS CONFIG
 * Allows:
 * - Chrome extensions
 * - LeetCode pages
 * - Your deployed frontend/extension
 */
app.use(
  cors({
    origin: [
      "https://leetcode.com",
      "https://leetcode.cn",
      "chrome-extension://*", // allow chrome extension
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper: build system prompt based on mode
function buildSystemPrompt(mode) {
  const base = `
You are "Code Buddy", a friendly but strict DSA mentor helping a student solve LeetCode problems.

General rules:
- Never give the full solution or full code immediately.
- Focus on teaching thinking, not just answers.
- Use short paragraphs and bullet points.
- Assume the user knows basic syntax but struggles with edge cases, logic, and patterns.
- You see: problem title, difficulty, slug, and the user's current code.
`;

  const mistakesMode = `
Mode: EXPLAIN_MISTAKES

Goals:
- Read the user's code and spot logical mistakes, edge cases, or complexity issues.
- Explain mistakes clearly (refer to ideas, not exact line numbers).
- Suggest *how* to fix them without rewriting the entire solution.
- Praise correct approaches before correcting mistakes.
`;

  const suggestMode = `
Mode: SUGGEST_NEXT_STEP

Goals:
- Assume the user is stuck.
- Ask 1–2 guiding questions.
- Suggest what to focus on next (pattern, data structure, observation).
- Allow small pseudocode hints; avoid full answers.
`;

  return (
    base +
    (mode === "mistakes" ? mistakesMode : suggestMode) +
    `
Output format:
- Be concise.
- Use bullet points.
- Never dump complete LeetCode solutions.
`
  );
}

app.post("/api/mentor", async (req, res) => {
  try {
    const { problemTitle, difficulty, problemSlug, code, mode } = req.body;

    if (!code || typeof code !== "string") {
      return res
        .status(400)
        .json({ reply: "Please paste your current code attempt first." });
    }

    const systemPrompt = buildSystemPrompt(mode);
    const userPrompt = `
Problem:
- Title: ${problemTitle || "Unknown"}
- Difficulty: ${difficulty || "Unknown"}
- Slug: ${problemSlug || "Unknown"}

User's current code:
\`\`\`
${code}
\`\`\`

User request:
${
  mode === "mistakes"
    ? "Explain what's wrong with my code."
    : "Help me with the next step without giving the full solution."
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 600,
      temperature: 0.4,
    });

    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      "I couldn’t generate feedback.";

    res.json({ reply });
  } catch (err) {
    console.error("Mentor API error:", err);
    res
      .status(500)
      .json({ reply: "Error talking to mentor AI. Check server logs." });
  }
});

// ✅ Health check (IMPORTANT for Render)
app.get("/", (req, res) => {
  res.send("Code Buddy backend is running ✅");
});

// ✅ Render will auto-assign PORT
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Code Buddy backend running on port ${PORT}`);
});