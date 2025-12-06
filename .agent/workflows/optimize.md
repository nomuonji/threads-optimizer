---
description: Analyze account performance and optimize the account concept interactively.
---

This workflow delegates the intelligence to the Agent (you).

1. **Fetch Analysis Data**: Run the command to get the current concept and top posts.
   `npm run analyze -- --account=[ACCOUNT_ID]`

2. **Analyze & Propose (Internal Thought)**:
   - Read the JSON output from the previous step.
   - Analyze the "top_posts" patterns, tone, and metrics.
   - Compare with the "current_concept".
   - Formulate an improved concept that captures the successful elements.
   - **Action**: Present the analysis and the *Proposed New Concept* to the user in the chat. Ask for confirmation to apply.

3. **Update Concept (On User Approval)**:
   - If the user says "Yes" or approves, run the update script.
   - `npm run update-concept -- --account=[ACCOUNT_ID] --concept="[NEW_CONCEPT_TEXT]"`
