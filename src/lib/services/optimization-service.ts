import { fetchTopPosts, fetchSystemInstruction, updateSystemInstruction } from "@/lib/services/firestore.server";
import { adminDb } from "@/lib/firebase/admin";

const MODEL = "models/gemini-flash-latest";
const GENERATION_CONFIG = {
    temperature: 0.7,
    topK: 32,
    topP: 0.95,
    maxOutputTokens: 4096,
    responseMimeType: "application/json",
};

async function requestGemini(prompt: string, apiKey: string) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: GENERATION_CONFIG }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message ?? `Gemini API request failed with status ${response.status}`);
    return data;
}

export async function optimizeSystemPrompt(accountId: string) {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) throw new Error("GEMINI_API_KEY is not configured.");

    const [topPosts, currentPrompt] = await Promise.all([
        fetchTopPosts(accountId, 10),
        fetchSystemInstruction(accountId),
    ]);

    if (topPosts.length < 3) {
        throw new Error("Not enough top posts to analyze (minimum 3 required).");
    }

    const postsText = topPosts.map(p => `- ${p.text} (Score: ${p.score})`).join("\n");

    const metaPrompt = `
You are an expert social media strategist and prompt engineer.
Your goal is to improve the "System Prompt" used by an AI to generate Threads posts for a specific account.

# CURRENT SYSTEM PROMPT
${currentPrompt || "(No current prompt, using default)"}

# HIGH PERFORMING POSTS
These are the posts that performed best recently:
${postsText}

# TASK
Analyze the high-performing posts to identify the tone, style, structure, and themes that resonate with the audience.
Then, rewrite the "System Prompt" to explicitly instruct the AI to generate posts in this successful style.
The new prompt should be concise, actionable, and focused on replicating the success factors.

Output strictly in JSON:
{
  "analysis": "Brief analysis of why these posts worked...",
  "new_system_prompt": "The improved system prompt..."
}
`;

    const raw = await requestGemini(metaPrompt, geminiApiKey);
    const text = raw.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned empty response.");

    const cleanText = text.replace(/```json\s*/gi, "").replace(/```\s*$/g, "").trim();
    const json = JSON.parse(cleanText);

    if (!json.new_system_prompt) {
        throw new Error("Gemini failed to generate a new system prompt.");
    }

    // Save history
    await adminDb.collection("optimization_history").add({
        account_id: accountId,
        old_prompt: currentPrompt,
        new_prompt: json.new_system_prompt,
        analysis: json.analysis,
        created_at: new Date().toISOString(),
    });

    // Update system prompt for this account
    await updateSystemInstruction(json.new_system_prompt, accountId);

    // Update system status
    await adminDb.collection("system").doc("status").set({
        [`lastOptimizationRun_${accountId}`]: new Date().toISOString(),
        [`lastOptimizationResult_${accountId}`]: {
            analysis: json.analysis,
            timestamp: new Date().toISOString()
        }
    }, { merge: true });

    return {
        oldPrompt: currentPrompt,
        newPrompt: json.new_system_prompt,
        analysis: json.analysis,
    };
}
