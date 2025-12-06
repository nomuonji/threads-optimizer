import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { publishThreadsPost } from "@/lib/platforms/threads";
import { publishXPost } from "@/lib/platforms/x";
import { DraftDoc, AccountDoc, PostDoc } from "@/lib/types";
import { DateTime } from "luxon";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const draftSnap = await adminDb.collection("drafts").doc(id).get();

        if (!draftSnap.exists) {
            return NextResponse.json({ ok: false, message: "Draft not found" }, { status: 404 });
        }

        const draft = { id: draftSnap.id, ...draftSnap.data() } as DraftDoc;

        const accountsSnap = await adminDb.collection("accounts").get();
        const accounts = accountsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AccountDoc));

        const account = accounts.find(a => a.id === draft.target_account_id) ?? accounts.find(a => a.platform === draft.target_platform);

        if (!account) {
            return NextResponse.json({ ok: false, message: "Account not found" }, { status: 400 });
        }

        let result;
        if (draft.target_platform === 'x') {
            result = await publishXPost(account, { text: draft.text });
        } else {
            result = await publishThreadsPost(account, { text: draft.text });
        }

        const nowStr = DateTime.utc().toISO();
        const prefixedId = `${draft.target_platform}_${result.platform_post_id}`;

        const newPost: PostDoc = {
            id: prefixedId,
            account_id: account.id,
            platform: draft.target_platform,
            platform_post_id: result.platform_post_id,
            text: draft.text,
            created_at: nowStr,
            media_type: "text",
            has_url: draft.text.includes("http"),
            metrics: {
                impressions: 0,
                likes: 0,
                replies: 0,
                reposts_or_rethreads: 0,
                quotes: 0,
                link_clicks: 0,
            },
            score: 0,
            raw: result.raw,
            url: result.url,
            fetched_at: nowStr,
        };

        const batch = adminDb.batch();
        batch.set(adminDb.collection("posts").doc(prefixedId), newPost);
        batch.delete(adminDb.collection("drafts").doc(id));
        await batch.commit();

        return NextResponse.json({ ok: true, postId: prefixedId });
    } catch (error) {
        return NextResponse.json({ ok: false, message: (error as Error).message }, { status: 500 });
    }
}
