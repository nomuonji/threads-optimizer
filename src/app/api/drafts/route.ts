import { NextResponse } from "next/server";
import { saveDraft } from "@/lib/services/firestore.server";
import { DateTime } from "luxon";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { text, accountId, platform, generatedBy } = body;

        if (!text || !accountId) {
            return NextResponse.json({ ok: false, message: "Text and Account ID are required" }, { status: 400 });
        }

        const draft = await saveDraft({
            text,
            target_account_id: accountId,
            target_platform: platform || 'threads',
            status: 'draft',
            created_at: DateTime.utc().toISO(),
            updated_at: DateTime.utc().toISO(),
            generatedBy,
            hashtags: [],
            created_by: 'api',
        });

        return NextResponse.json({ ok: true, draftId: draft.id });
    } catch (error) {
        return NextResponse.json({ ok: false, message: (error as Error).message }, { status: 500 });
    }
}
