import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { ExemplaryPost } from "@/lib/types";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const snapshot = await adminDb.collection("exemplary_posts").where("account_id", "==", id).get();
        const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json({ ok: true, posts });
    } catch (error) {
        return NextResponse.json({ ok: false, message: (error as Error).message }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { text, explanation, platform } = body;

        const newPost: Omit<ExemplaryPost, 'id'> = {
            account_id: id,
            text,
            explanation,
            platform: platform || 'threads',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const docRef = await adminDb.collection("exemplary_posts").add(newPost);
        return NextResponse.json({ ok: true, post: { id: docRef.id, ...newPost } });
    } catch (error) {
        return NextResponse.json({ ok: false, message: (error as Error).message }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { searchParams } = new URL(request.url);
        const postId = searchParams.get('id');

        if (!postId) {
            return NextResponse.json({ ok: false, message: "Post ID required" }, { status: 400 });
        }

        await adminDb.collection("exemplary_posts").doc(postId).delete();
        return NextResponse.json({ ok: true });
    } catch (error) {
        return NextResponse.json({ ok: false, message: (error as Error).message }, { status: 500 });
    }
}
