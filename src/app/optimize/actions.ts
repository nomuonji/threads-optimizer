"use server";

import { adminDb } from "@/lib/firebase/admin";
import { optimizeConcept } from "@/lib/services/optimization-service";
import { getAccounts as fetchAccounts, getAccount } from "@/lib/services/firestore.server";
import { DateTime } from "luxon";
import type { AccountDoc } from "@/lib/types";

export async function getAccounts(): Promise<Pick<AccountDoc, 'id' | 'handle' | 'display_name' | 'platform' | 'optimizationEnabled' | 'concept'>[]> {
    const accounts = await fetchAccounts();
    return accounts.map(acc => ({
        id: acc.id,
        handle: acc.handle,
        display_name: acc.display_name,
        platform: acc.platform,
        optimizationEnabled: acc.optimizationEnabled,
        concept: acc.concept,
    }));
}

export async function getConcept(accountId: string): Promise<string | undefined> {
    const account = await getAccount(accountId);
    const concept = account?.concept;
    if (concept === null || concept === undefined) return undefined;
    if (typeof concept === "object") return JSON.stringify(concept, null, 2);
    return String(concept);
}

export async function saveConcept(accountId: string, concept: string): Promise<void> {
    await adminDb.collection("accounts").doc(accountId).update({
        concept,
        updated_at: new Date().toISOString(),
    });
}

export async function triggerOptimization(accountId: string) {
    return await optimizeConcept(accountId);
}

export async function getOptimizationHistory(accountId: string) {
    try {
        const snapshot = await adminDb
            .collection("optimization_history")
            .where("account_id", "==", accountId)
            .orderBy("created_at", "desc")
            .limit(20)
            .get();

        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        const message = (error as Error).message ?? "";
        // If index is missing, fallback to unordered query and sort in-memory
        if (message.includes("requires an index")) {
            console.warn("[getOptimizationHistory] Index missing, using fallback query");
            const fallbackSnapshot = await adminDb
                .collection("optimization_history")
                .where("account_id", "==", accountId)
                .get();

            const docs = fallbackSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            })) as Array<{ id: string; created_at?: string;[key: string]: unknown }>;

            return docs
                .sort((a, b) => {
                    const timeA = a.created_at ? DateTime.fromISO(a.created_at).toMillis() : 0;
                    const timeB = b.created_at ? DateTime.fromISO(b.created_at).toMillis() : 0;
                    return timeB - timeA;
                })
                .slice(0, 20);
        }
        throw error;
    }
}
