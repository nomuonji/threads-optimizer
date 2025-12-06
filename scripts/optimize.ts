
import "dotenv/config";
import { optimizeConcept } from "../src/lib/services/optimization-service";
import { getAccounts } from "../src/lib/services/firestore.server";

async function main() {
    const args = process.argv.slice(2);
    let accountId = args.find(a => !a.startsWith("-"));

    if (!accountId) {
        // If no ID, but only one account exists, use it
        const accounts = await getAccounts();
        if (accounts.length === 1) {
            accountId = accounts[0].id;
        } else {
            // Try to find --account flag
            const flag = args.find(a => a.startsWith("--account="));
            if (flag) {
                accountId = flag.split("=")[1];
            }
        }
    }

    if (!accountId) {
        console.error("Please specify an account ID.");
        const accounts = await getAccounts();
        if (accounts.length > 0) {
            console.log("Available accounts:");
            accounts.forEach(a => console.log(`  - ${a.id} (@${a.handle})`));
        }
        return;
    }

    console.log(`Starting concept optimization for account: ${accountId}...`);
    console.log("This involves analyzing top posts with Gemini. Please wait.");

    try {
        const result = await optimizeConcept(accountId);

        console.log("\n==================================");
        console.log("       OPTIMIZATION RESULT        ");
        console.log("==================================\n");

        console.log("--- Analysis ---");
        console.log(result.analysis);
        console.log("\n");

        console.log("--- New Concept ---");
        console.log(result.newConcept);
        console.log("-------------------");

        console.log("\nAccount concept has been updated in database.");

    } catch (error) {
        console.error("Optimization failed:", error);
    }
}

main();
