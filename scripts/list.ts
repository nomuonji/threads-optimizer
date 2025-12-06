
import "dotenv/config";
import { getAccounts } from "../src/lib/services/firestore.server";

async function main() {
    console.log("Fetching accounts...");
    try {
        const accounts = await getAccounts();
        if (accounts.length === 0) {
            console.log("No accounts found.");
            return;
        }

        console.log("\n--- Connected Accounts ---");
        accounts.forEach(acc => {
            console.log(`[${acc.id}] @${acc.handle} (${acc.platform})`);
            if (acc.concept) {
                console.log(`   Concept: ${String(acc.concept).slice(0, 50)}...`);
            }
            console.log(`   Optimized: ${acc.optimizationEnabled ? "Yes" : "No"}`);
        });
        console.log("--------------------------\n");

    } catch (error) {
        console.error("Failed to list accounts:", error);
    }
}

main();
