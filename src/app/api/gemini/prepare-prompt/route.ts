import { NextResponse } from "next/server";
import { preparePromptPayload } from "@/lib/services/prompt-service";
import { buildPrompt } from "@/lib/gemini/prompt";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { accountId, limit } = body;

        if (!accountId) {
            return NextResponse.json({ ok: false, message: "Account ID is required" }, { status: 400 });
        }

        const payload = await preparePromptPayload(accountId, limit || 15);
        const { account, topPosts, referencePosts, recentPosts, drafts, tips, exemplaryPosts, systemInstruction } = payload;

        // Extract extraAvoid from recent posts
        const extraAvoid = recentPosts.map(p => p.text);

        const prompt = buildPrompt(
            topPosts,
            referencePosts,
            recentPosts,
            drafts,
            extraAvoid,
            tips,
            exemplaryPosts,
            account.concept,
            systemInstruction,
            account.minPostLength,
            account.maxPostLength
        );

        return NextResponse.json({ ok: true, prompt });
    } catch (error) {
        return NextResponse.json({ ok: false, message: (error as Error).message }, { status: 500 });
    }
}
