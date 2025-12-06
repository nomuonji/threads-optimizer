import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { DateTime } from "luxon";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await adminDb.collection("drafts").doc(id).delete();
        return NextResponse.json({ ok: true });
    } catch (error) {
        return NextResponse.json({ ok: false, message: (error as Error).message }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();

        await adminDb.collection("drafts").doc(id).set({
            ...body,
            updated_at: DateTime.utc().toISO(),
        }, { merge: true });

        return NextResponse.json({ ok: true });
    } catch (error) {
        return NextResponse.json({ ok: false, message: (error as Error).message }, { status: 500 });
    }
}
