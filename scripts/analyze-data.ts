
import "dotenv/config";
import { fetchTopPosts, getAccount, upsertPost } from "../src/lib/services/firestore.server";

async function main() {
    const args = process.argv.slice(2);
    let accountId = args.find(a => !a.startsWith("-"));

    if (!accountId) {
        // Try --account flag
        const flag = args.find(a => a.startsWith("--account="));
        if (flag) {
            accountId = flag.split("=")[1];
        }
    }

    if (!accountId) {
        console.error("Error: Account ID required.");
        process.exit(1);
    }

    try {
        const [account, topPosts] = await Promise.all([
            getAccount(accountId),
            fetchTopPosts(accountId, 15)
        ]);

        if (!account) {
            console.error("Error: Account not found.");
            process.exit(1);
        }

        const result = {
            account: {
                id: account.id,
                handle: account.handle,
                platform: account.platform,
                current_concept: account.concept
            },
            top_posts: topPosts.map(p => ({
                text: p.text,
                score: p.score,
                metrics: p.metrics,
                created_at: p.created_at
            }))
        };

        console.log(JSON.stringify(result, null, 2));

    } catch (error) {
        console.error("Failed to fetch analysis data:", error);
        process.exit(1);
    }
}

main();
