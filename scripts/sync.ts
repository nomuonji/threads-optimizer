
import "dotenv/config";
import { syncPostsForAllAccounts } from "../src/lib/services/sync-service";

async function main() {
    const args = process.argv.slice(2);
    const accountIds = args.length > 0 ? args : undefined;

    console.log(`Starting sync for ${accountIds ? accountIds.join(", ") : "all accounts"}...`);

    try {
        const results = await syncPostsForAllAccounts({ accountIds });

        console.log("\n--- Sync Results ---");
        results.forEach(res => {
            const symbol = res.error ? "✖" : "✔";
            console.log(`${symbol} @${res.handle}: Fetched ${res.fetched}, Stored ${res.stored}`);
            if (res.error) {
                console.error(`   Error: ${res.error}`);
            }
        });
        console.log("--------------------\n");

    } catch (error) {
        console.error("Sync failed:", error);
    }
}

main();
