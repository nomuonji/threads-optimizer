
import "dotenv/config";
import { adminDb } from "../src/lib/firebase/admin";

async function main() {
    const args = process.argv.slice(2);
    const accountId = args[0];

    if (!accountId) {
        console.error("Usage: tsx scripts/show-history.ts <account-id>");
        process.exit(1);
    }

    try {
        const snapshot = await adminDb
            .collection("optimization_history")
            .where("account_id", "==", accountId)
            .orderBy("created_at", "desc")
            .limit(1)
            .get();

        if (snapshot.empty) {
            console.log("No optimization history found.");
            return;
        }

        const data = snapshot.docs[0].data();
        console.log("=== Latest Optimization Analysis ===");
        console.log(data.analysis);
        console.log("\n=== New Concept ===");
        console.log(data.new_prompt);

    } catch (error) {
        // Fallback if index missing
        console.error("Failed to fetch history:", error);
    }
}

main();
