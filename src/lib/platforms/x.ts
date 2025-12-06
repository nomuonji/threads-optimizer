import { AccountDoc } from "@/lib/types";
import { SyncPostPayload } from "./types";

export async function fetchRecentXPosts(
    account: AccountDoc,
    options: { startTime?: string; limit?: number },
): Promise<{ posts: SyncPostPayload[]; debug: string[] }> {
    // Stub implementation for now as we focus on Threads
    return {
        posts: [],
        debug: ["X integration not yet implemented in this repo."],
    };
}

export async function publishXPost(
    account: AccountDoc,
    payload: { text: string },
): Promise<any> {
    throw new Error("X publishing not implemented");
}
