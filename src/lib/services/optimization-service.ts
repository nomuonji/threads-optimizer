import { fetchTopPosts, fetchRecentPosts, getAccount } from "@/lib/services/firestore.server";
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

    const [recentPosts, topPosts, account] = await Promise.all([
        fetchRecentPosts(accountId, 20),
        fetchTopPosts(accountId, 20),
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

    if (recentPosts.length < 3) {
        throw new Error("Not enough posts to analyze.");
    }

    // Helper to format posts
    const formatPosts = (posts: typeof recentPosts) => posts.map((p, i) => {
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

    const recentPostsText = formatPosts(recentPosts);
    const topPostsText = formatPosts(topPosts);

    // Calculate Scores for Comparison
    const currentScoreAvg = recentPosts.length > 0
        ? recentPosts.reduce((sum, p) => sum + p.score, 0) / recentPosts.length
        : 0;

    const bestScore = account.concept_best_score ?? 0;
    const bestConcept = account.concept_best;

    // Check if current concept beat the record
    let isNewBest = false;
    if (currentScoreAvg > bestScore && recentPosts.length >= 5) {
        isNewBest = true;
    }

    const metaPrompt = `
You are an expert social media strategist analyzing a Japanese social media account.
Your goal is to optimize the "Account Concept" (persona, style, strategy) by evaluating the *Current Performance* against historical bests.

# PERFORMANCE METRICS
- **Current Average Score**: ${currentScoreAvg.toFixed(2)}
- **Historical Best Score**: ${bestScore.toFixed(2)}
- **Is Current Concept Winning?**: ${isNewBest ? "YES (New Record)" : "NO (Below Best)"}

# CURRENT ACCOUNT CONCEPT (Active)
${currentConcept || "(No concept defined yet)"}

${bestConcept ? `# HISTORICAL BEST CONCEPT (Reference - Produced Score ${bestScore.toFixed(2)})\n${bestConcept}\n` : ""}

# DATA SET 1: RECENT POSTS (Last 20 posts - Current execution)
These posts reflect how the account is currently operating under the concept above. Analyze them for consistency and recent trends.
${recentPostsText}

# DATA SET 2: TOP PERFORMING POSTS (All time top 20 - Success benchmarks)
These posts prove what works best for this audience.
${topPostsText}

# ANALYSIS TASK
Provide a detailed critical analysis in Japanese covering:

1. **現状の評価 (Performance Status)**:
   - 現在のスコア (${currentScoreAvg.toFixed(2)}) は、過去のベスト (${bestScore.toFixed(2)}) と比べてどう評価できるか？
   - ${isNewBest ? "スコアが伸びている勝因は何か？この路線をどう強化すべきか？" : "スコアが落ちている原因は何か？（過去のベストコンセプトから乖離しすぎていないか？）"}

2. **ギャップ分析 (Gap Analysis)**:
   - "Top Posts"にあるが"Recent Posts"に欠けている要素を特定。

3. **改善戦略 (Optimization Strategy)**:
   - ${isNewBest ? "現在のコンセプトをベースに、さらに磨きをかける。" : "現在のコンセプトは失敗の可能性がある。過去のベストコンセプト（もしあれば）の要素を強く取り戻しつつ、修正する。"}

# OUTPUT TASK
Based on your analysis, create an **Optimized Account Concept** strictly in JSON format.
The new concept must be the strongest possible version.

Output strictly in JSON format:
{
  "analysis": "詳細な分析結果（現状評価とギャップ分析を含む、日本語で1000文字程度）",
  "new_concept": "改善されたアカウントコンセプト（日本語。Persona, Tone, Topics, Posting Styleなどを含むJSON構造）"
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
        score_before: currentScoreAvg,
        is_new_best: isNewBest
    });

    // Update account concept
    const updateData: any = {
        concept: newConcept,
        concept_score: currentScoreAvg,
        updated_at: new Date().toISOString(),
    };

    // If this run produced a new best score (based on recent performance of the *previous* concept),
    // we save the *previous* concept as the best one (because it generated that score).
    // Wait, logic check: currentScoreAvg is based on posts generated by `currentConcept`.
    // So if currentScoreAvg is high, `currentConcept` was good. We should save `currentConcept` as best.
    // BUT we are about to overwrite `concept` with `newConcept`.

    if (isNewBest) {
        updateData.concept_best = currentConcept;
        updateData.concept_best_score = currentScoreAvg;
    }

    await adminDb.collection("accounts").doc(accountId).update(updateData);

    // Update system status
    await adminDb.collection("system").doc("status").set({
        [`lastOptimizationRun_${accountId}`]: new Date().toISOString(),
        [`lastOptimizationResult_${accountId}`]: {
            analysis: analysis,
            timestamp: new Date().toISOString(),
            score: currentScoreAvg
        }
    }, { merge: true });

    return {
        oldConcept: currentConcept,
        newConcept: newConcept,
        analysis: analysis,
        prompt: metaPrompt,
    };
}
