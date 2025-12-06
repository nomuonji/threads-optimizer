import { NextResponse } from "next/server";
import { generatePost } from "@/lib/services/prompt-service";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { accountId, limit } = body;

        if (!accountId) {
            return NextResponse.json({ ok: false, message: "Account ID is required" }, { status: 400 });
        }

        const result = await generatePost(accountId, 'threads', limit || 15);

        return NextResponse.json({
            ok: true,
            suggestion: {
                tweet: result.text,
                explanation: "Generated based on your top performing posts and style.",
            },
            modelUsed: "gemini-1.5-pro",
            context: {
                usedPosts: [], // Simplified for now
                existingDrafts: [],
            },
            duplicate: false,
        });
    } catch (error) {
        return NextResponse.json({ ok: false, message: (error as Error).message }, { status: 500 });
    }
}
