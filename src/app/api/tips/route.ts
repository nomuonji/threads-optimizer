import { NextResponse } from "next/server";
import { getAllTips } from "@/lib/services/firestore.server";

export async function GET() {
    try {
        const tips = await getAllTips();
        return NextResponse.json({ ok: true, tips });
    } catch (error) {
        return NextResponse.json({ ok: false, message: (error as Error).message }, { status: 500 });
    }
}
