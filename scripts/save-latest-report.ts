
import "dotenv/config";
import { adminDb } from "../src/lib/firebase/admin";
import * as fs from "fs";
import * as path from "path";

async function main() {
    const args = process.argv.slice(2);
    const accountId = args[0];

    if (!accountId) {
        console.error("Usage: tsx scripts/save-latest-report.ts <account-id>");
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

        let report = `# Optimization Report for ${accountId}\n`;
        report += `**Date:** ${data.created_at}\n\n`;
        report += `## 🧠 Analysis\n\n${data.analysis}\n\n`;
        report += `## ✨ New Concept\n\n\`\`\`json\n${data.new_prompt}\n\`\`\`\n\n`;
        report += `## 📜 Old Concept\n\n\`\`\`json\n${data.old_prompt}\n\`\`\`\n`;

        const reportPath = path.resolve(process.cwd(), "OPTIMIZATION_REPORT.md");
        fs.writeFileSync(reportPath, report, "utf-8");
        console.log(`Report saved to: ${reportPath}`);

    } catch (error) {
        console.error("Failed to fetch history:", error);
    }
}

main();
