"use server";

import { adminDb } from "@/lib/firebase/admin";
import { optimizeSystemPrompt } from "@/lib/services/optimization-service";
import { fetchSystemInstruction, updateSystemInstruction } from "@/lib/services/firestore.server";

export async function getSystemPrompt(accountId?: string) {
    return await fetchSystemInstruction(accountId);
}

export async function saveSystemPrompt(prompt: string, accountId?: string) {
    await updateSystemInstruction(prompt, accountId);
}

export async function triggerOptimization(accountId: string) {
    return await optimizeSystemPrompt(accountId);
}

export async function getOptimizationHistory(accountId: string) {
    const snapshot = await adminDb
        .collection("optimization_history")
        .where("account_id", "==", accountId)
        .orderBy("created_at", "desc")
        .limit(20)
        .get();

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
