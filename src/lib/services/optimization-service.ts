import { fetchTopPosts, getAccount } from "@/lib/services/firestore.server";
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

export async function optimizeConcept(accountId: string) {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) throw new Error("GEMINI_API_KEY is not configured.");

    const [topPosts, account] = await Promise.all([
        fetchTopPosts(accountId, 15), // Balanced: enough data without hitting token limits
        getAccount(accountId),
    ]);

    if (!account) {
        throw new Error("Account not found.");
    }

    // Ensure currentConcept is a string
    let currentConcept = account.concept;
    if (currentConcept && typeof currentConcept === "object") {
        currentConcept = JSON.stringify(currentConcept, null, 2);
    }

    if (topPosts.length < 3) {
        throw new Error("Not enough top posts to analyze (minimum 3 required).");
    }

    // Build detailed posts data with metrics
    const postsText = topPosts.map((p, i) => {
        const m = p.metrics;
        const metrics = [
            `Likes: ${m.likes}`,
            `Replies: ${m.replies}`,
            `Reposts: ${m.reposts_or_rethreads}`,
            m.quotes !== undefined ? `Quotes: ${m.quotes}` : null,
            m.impressions !== null ? `Impressions: ${m.impressions}` : null,
        ].filter(Boolean).join(", ");

        return `${i + 1}. "${p.text}"
   Score: ${p.score} | ${metrics}
   Posted: ${p.created_at}`;
    }).join("\n\n");

    const metaPrompt = `
You are an expert social media strategist analyzing a Japanese social media account.
Your goal is to improve the "Account Concept" that defines the persona and style of this account.

# CURRENT ACCOUNT CONCEPT
${currentConcept || "(No concept defined yet)"}

# HIGH PERFORMING POSTS (${topPosts.length} posts, ordered by engagement score)
Analyze these posts carefully - each includes engagement metrics (likes, replies, reposts):

${postsText}

# ANALYSIS TASK
Provide a detailed analysis in Japanese covering:

1. **投稿パターン分析**: 上位投稿に共通するテーマ、キーワード、話題を特定
2. **エンゲージメント要因**: いいね・リプライ・リポストが多い投稿の特徴（何が反応を引き出しているか）
3. **文体・トーン**: 読者に響く語調、文章構造、表現手法
4. **改善ポイント**: 現在のコンセプトの強み・弱み

# OUTPUT TASK
Based on your analysis, create an improved "Account Concept" that:
- Captures the successful elements from top posts
- Provides clear, actionable guidelines for content creation
- Defines the persona, voice, style, and themes

Output strictly in JSON format:
{
  "analysis": "詳細な分析結果（上記4点を含む、日本語で500文字以上）",
  "new_concept": "改善されたアカウントコンセプト（日本語、具体的で実用的な内容）"
}
`;


    const raw = await requestGemini(metaPrompt, geminiApiKey);
    const text = raw.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        // Check for safety/block reasons
        const blockReason = raw.candidates?.[0]?.finishReason || raw.promptFeedback?.blockReason;
        const errorDetails = blockReason
            ? `Reason: ${blockReason}`
            : `Raw response: ${JSON.stringify(raw).slice(0, 500)}`;
        throw new Error(`Gemini returned empty response. ${errorDetails}`);
    }

    // Clean up the response for JSON parsing
    let cleanText = text
        .replace(/```json\s*/gi, "")
        .replace(/```\s*$/g, "")
        .trim();

    // Try to extract JSON if there's extra text around it
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        cleanText = jsonMatch[0];
    }

    let json;
    try {
        json = JSON.parse(cleanText);
    } catch {
        // If direct parsing fails, try to fix common issues with newlines in string values
        // Replace actual newlines inside JSON string values with escaped newlines
        try {
            // First attempt: replace all newlines with escaped newlines
            const fixedText = cleanText
                .replace(/\r\n/g, '\\n')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\n')
                .replace(/\t/g, '\\t');
            json = JSON.parse(fixedText);
        } catch (parseError) {
            throw new Error(`Failed to parse Gemini response as JSON: ${(parseError as Error).message}. Response preview: ${text.slice(0, 500)}`);
        }
    }

    if (!json.new_concept) {
        throw new Error("Gemini failed to generate a new concept.");
    }

    // Ensure values are strings (Gemini sometimes returns objects)
    const newConcept = typeof json.new_concept === "object"
        ? JSON.stringify(json.new_concept, null, 2)
        : String(json.new_concept);
    const analysis = typeof json.analysis === "object"
        ? JSON.stringify(json.analysis, null, 2)
        : String(json.analysis ?? "");

    // Save history
    await adminDb.collection("optimization_history").add({
        account_id: accountId,
        old_prompt: currentConcept ?? "",
        new_prompt: newConcept,
        analysis: analysis,
        created_at: new Date().toISOString(),
    });

    // Update account concept
    await adminDb.collection("accounts").doc(accountId).update({
        concept: newConcept,
        updated_at: new Date().toISOString(),
    });

    // Update system status
    await adminDb.collection("system").doc("status").set({
        [`lastOptimizationRun_${accountId}`]: new Date().toISOString(),
        [`lastOptimizationResult_${accountId}`]: {
            analysis: analysis,
            timestamp: new Date().toISOString()
        }
    }, { merge: true });

    return {
        oldConcept: currentConcept,
        newConcept: newConcept,
        analysis: analysis,
        prompt: metaPrompt,
    };
}
