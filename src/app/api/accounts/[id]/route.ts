import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();

        await adminDb.collection("accounts").doc(id).set(body, { merge: true });

        return NextResponse.json({ ok: true });
    } catch (error) {
        return NextResponse.json({ ok: false, message: (error as Error).message }, { status: 500 });
    }
}
