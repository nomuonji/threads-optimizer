
import "dotenv/config";
import { generatePost } from "../src/lib/services/prompt-service";
import { getAccounts } from "../src/lib/services/firestore.server";

async function main() {
    const args = process.argv.slice(2);
    // Support --account=ID or just passing ID
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
        console.error("Please specify an account ID using --account=<ID> or as the first argument.");
        const accounts = await getAccounts();
        if (accounts.length > 0) {
            console.log("Available accounts:");
            accounts.forEach(a => console.log(`  - ${a.id} (@${a.handle})`));
        }
        return;
    }

    console.log(`Generating draft for account: ${accountId}...`);

    try {
        // Platform is currently not strictly used in logic but required by type?
        // generatePost implementation uses account's platform if available? 
        // Actually generatePost has (accountId, platform, limit).
        // Let's refetch account to be sure about platform.
        const accounts = await getAccounts();
        const account = accounts.find(a => a.id === accountId);
        if (!account) throw new Error("Account not found");

        const draft = await generatePost(accountId, account.platform, 15);

        console.log("\n--- Generated Draft ---");
        console.log(draft.text);
        console.log("------------------------");
        console.log(`Draft saved with ID: ${draft.id}`);
        if (draft.similarity_warning) {
            console.warn("Warning: This draft is similar to an existing one.");
        }

    } catch (error) {
        console.error("Draft generation failed:", error);
    }
}

main();
