
import "dotenv/config";
import { saveConcept, getAccount } from "../src/lib/services/firestore.server";

async function main() {
    const args = process.argv.slice(2);

    // Parse arguments simple way: expect --account=ID and --concept="Concept Text"
    let accountId = "";
    let concept = "";

    args.forEach(arg => {
        if (arg.startsWith("--account=")) {
            accountId = arg.split("=")[1];
        } else if (arg.startsWith("--concept=")) {
            // This is tricky if concept has spaces and wasn't quoted properly by shell, 
            // but assuming run_command handles quotes correctly.
            // Actually, for long text, it might be safer to read from stdin or file, 
            // but for now let's try argument or last arg.
            concept = arg.substring(10);
        }
    });

    // Fallback parsing if positional
    if (!accountId && args.length >= 2) {
        accountId = args[0];
        concept = args[1];
    }

    if (!accountId || !concept) {
        console.error("Usage: tsx scripts/update-concept.ts --account=<ID> --concept=\"<New Concept>\"");
        process.exit(1);
    }

    try {
        const account = await getAccount(accountId);
        if (!account) {
            console.error("Error: Account not found.");
            process.exit(1);
        }

        console.log(`Updating concept for @${account.handle}...`);
        await saveConcept(accountId, concept);
        console.log("Successfully updated account concept.");

    } catch (error) {
        console.error("Failed to update concept:", error);
        process.exit(1);
    }
}

main();
