
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { DateTime } from "luxon";
import { getAccounts, getRapidApiUsage, getTopPosts, listDrafts } from "../src/lib/services/firestore.server";

async function main() {
    console.log("Generating dashboard...");

    try {
        const [accounts, usage] = await Promise.all([
            getAccounts(),
            getRapidApiUsage()
        ]);

        let md = `# 📊 Threads Optimizer Dashboard\n`;
        md += `**Last Updated:** ${DateTime.now().toFormat("yyyy-MM-dd HH:mm:ss")}\n\n`;

        // --- System Status ---
        md += `## ⚙️ System Status\n`;
        md += `- **API Usage (${usage.month}):** ${usage.count} requests\n`;
        md += `- **Active Accounts:** ${accounts.length}\n`;
        md += `\n---\n\n`;

        // --- Accounts Overview ---
        for (const account of accounts) {
            md += `## 👤 ${account.display_name || account.handle} (@${account.handle})\n`;
            md += `- **Platform:** ${account.platform}\n`;
            md += `- **Optimization:** ${account.optimizationEnabled ? "✅ Enabled" : "⬜ Disabled"}\n`;
            md += `- **Concept:** ${account.concept ? `"${String(account.concept).slice(0, 80)}..."` : "(None)"}\n`;

            // Fetch Account Data
            const [topPostsResult, drafts] = await Promise.all([
                getTopPosts({ accountId: account.id, platform: "all", media_type: "all", period_days: "all" }, { sort: "top", limit: 3, page: 1 }),
                listDrafts(account.id)
            ]);

            // Top Posts
            md += `\n### 🏆 Top Performing Posts\n`;
            if (topPostsResult.posts.length > 0) {
                md += `| Score | Likes | Text |\n`;
                md += `| :--- | :--- | :--- |\n`;
                topPostsResult.posts.forEach(p => {
                    const text = p.text.replace(/\n/g, " ").slice(0, 50) + (p.text.length > 50 ? "..." : "");
                    md += `| **${p.score.toFixed(1)}** | ${p.metrics.likes} | ${text} |\n`;
                });
            } else {
                md += `_No posts found or sync required._\n`;
            }

            // Drafts
            const pendingDrafts = drafts.filter(d => d.status !== 'published');
            md += `\n### 📝 Pending Drafts (${pendingDrafts.length})\n`;
            if (pendingDrafts.length > 0) {
                md += `| Status | ID | Content |\n`;
                md += `| :--- | :--- | :--- |\n`;
                pendingDrafts.slice(0, 5).forEach(d => {
                    const text = d.text.replace(/\n/g, " ").slice(0, 40) + (d.text.length > 40 ? "..." : "");
                    md += `| ${d.status} | \`${d.id}\` | ${text} |\n`;
                });
                if (pendingDrafts.length > 5) md += `... and ${pendingDrafts.length - 5} more\n`;
            } else {
                md += `_No pending drafts._\n`;
            }

            md += `\n---\n`;
        }

        const dashboardPath = path.resolve(process.cwd(), "DASHBOARD.md");
        fs.writeFileSync(dashboardPath, md, "utf-8");

        console.log(`Dashboard generated at: ${dashboardPath}`);

    } catch (error) {
        console.error("Failed to generate dashboard:", error);
    }
}

main();
