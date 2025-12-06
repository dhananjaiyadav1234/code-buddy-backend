// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
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
- Explain mistakes clearly, referencing specific lines or ideas (describe them, don't rely on exact line numbers).
- Suggest *how* to fix them, but don't rewrite the entire solution.
- If the code is mostly correct, praise the approach and only refine the final issues.
`;

  const suggestMode = `
Mode: SUGGEST_NEXT_STEP

Goals:
- Assume the user is stuck or unsure how to continue.
- Do NOT critique line-by-line; instead:
  - Ask 1–2 guiding questions.
  - Suggest what they should focus on next (data structure, pattern, key observation).
  - You may give tiny pseudo-code hints, but avoid full answer.
- If the user seems very lost, you can outline the high-level approach in steps (1, 2, 3...).
`;

  return (
    base +
    (mode === "mistakes" ? mistakesMode : suggestMode) +
    `
Output format:
- Be concise.
- Use bullet points where helpful.
- Never dump full LeetCode solution code unless the user explicitly begs multiple times (which we assume they haven't here).
`
  );
}

app.post("/api/mentor", async (req, res) => {
  try {
    const { problemTitle, difficulty, problemSlug, code, mode } = req.body;

    if (!code || typeof code !== "string") {
      return res.status(400).json({ reply: "Please provide your current code attempt." });
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

User request type: ${mode === "mistakes" ? "Explain what's wrong with my code." : "Help me with the next step without spoiling everything."}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 600,
      temperature: 0.4
    });

    const reply = completion.choices[0]?.message?.content?.trim() || "I couldn't generate feedback.";

    res.json({ reply });
  } catch (err) {
    console.error("Mentor API error:", err);
    res.status(500).json({ reply: "Error talking to mentor AI. Check server logs." });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Code Buddy mentor API running on http://localhost:${PORT}`);
});