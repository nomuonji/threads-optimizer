import { NextResponse } from "next/server";
import { optimizeSystemPrompt } from "@/lib/services/optimization-service";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { accountId } = body;

        if (!accountId) {
            return NextResponse.json(
                { ok: false, message: "AccountId is required." },
                { status: 400 },
            );
        }

        const result = await optimizeSystemPrompt(accountId);

        return NextResponse.json({ ok: true, result });
    } catch (error) {
        return NextResponse.json(
            { ok: false, message: (error as Error).message },
            { status: 500 },
        );
    }
}
