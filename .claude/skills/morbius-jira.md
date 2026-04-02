---
name: morbius-jira
description: Pull bug tickets from Jira into the Morbius QA dashboard. Syncs Jira issues as markdown bug files so they appear on the Bug Board alongside local bugs. Use when someone says "sync Jira", "pull bugs from Jira", "load Jira tickets", or "connect Jira".
user_invocable: true
---

# Sync Jira Bugs into Morbius

You pull bug tickets from Jira and write them as markdown files in the Morbius data folder. The dashboard displays them alongside local bugs.

## Step 1: Get Jira Cloud ID

If you don't already know the cloud ID, get it:

```
Use tool: mcp__525d10ff-99e6-4559-aa7f-d62225b78308__getAccessibleAtlassianResources
```

This returns the available Atlassian sites. Use the `id` or site URL as the `cloudId`.

## Step 2: Determine the Jira Project

Ask the user which Jira project to pull bugs from. Get the project key (e.g., "STS", "MA", "SHORR").

If unsure, list available projects:
```
Use tool: mcp__525d10ff-99e6-4559-aa7f-d62225b78308__getVisibleJiraProjects
Parameters: { cloudId: "<cloud-id>" }
```

## Step 3: Search for Bug Issues

Pull all bug issues from the Jira project:

```
Use tool: mcp__525d10ff-99e6-4559-aa7f-d62225b78308__searchJiraIssuesUsingJql
Parameters: {
  cloudId: "<cloud-id>",
  jql: "project = <PROJECT_KEY> AND type = Bug ORDER BY updated DESC",
  fields: ["summary", "status", "priority", "description", "created", "updated", "assignee", "labels", "components"],
  maxResults: 50,
  responseContentFormat: "markdown"
}
```

## Step 4: Map Jira Issues to Morbius Bug Markdown

For each Jira issue, create or update a markdown file in `data/<active-project>/bugs/`.

### Status Mapping

| Jira Status | Morbius Status |
|-------------|---------------|
| To Do, Open, New, Backlog, Reopened | `open` |
| In Progress, In Review, In Development | `investigating` |
| Done, Resolved, Fixed, Verified | `fixed` |
| Closed, Won't Fix, Declined, Won't Do | `closed` |

### Priority Mapping

| Jira Priority | Morbius Priority |
|---------------|-----------------|
| Highest, Blocker | P1 |
| High, Critical | P2 |
| Medium | P3 |
| Low, Lowest | P4 |

### Write the Markdown File

For each issue, write a file at `data/<active-project>/bugs/<jira-key-lowercase>.md`:

```markdown
---
id: <JIRA_KEY>
title: <summary>
status: <mapped_status>
priority: <mapped_priority>
category: <first label or component, or "jira">
linked_test: ""
device: ""
created: <created date>
updated: <updated date>
source: jira
jira_key: <JIRA_KEY>
jira_url: https://<site>.atlassian.net/browse/<JIRA_KEY>
assignee: <assignee display name or "Unassigned">
---

## Failure Reason
<description from Jira, or summary if no description>

## Notes
_Synced from Jira on <today's date>_
```

### Dedup Logic

Before writing, check if a file with the same `jira_key` already exists:

```bash
grep -rl "jira_key: <JIRA_KEY>" data/<active-project>/bugs/ 2>/dev/null
```

- If found → **update** the existing file (status, priority, assignee, updated date)
- If not found → **create** a new file

## Step 5: Save Jira Config to Project

Update `data/projects.json` to store the Jira config for future syncs:

```json
{
  "id": "<project-id>",
  "jira": {
    "cloudId": "<cloud-id>",
    "projectKey": "<PROJECT_KEY>"
  }
}
```

## Step 6: Report Results

After syncing, report:
- How many issues pulled from Jira
- How many new bugs created
- How many existing bugs updated
- Any issues that couldn't be mapped

Then tell the user to refresh the dashboard or run `morbius serve` to see the Jira bugs on the Bug Board.

## Example Full Sync

```
1. Get cloud ID → "abc123-..."
2. User says "pull from STS project"
3. Search JQL: "project = STS AND type = Bug ORDER BY updated DESC"
4. Got 15 issues
5. Write 15 markdown files to data/sts/bugs/
   - 12 new, 3 updated (matched by jira_key)
6. Update projects.json with jira config
7. Tell user: "Synced 15 bugs from Jira STS. 12 new, 3 updated. Refresh the board."
```

## Key Rules

- **Never push TO Jira** — this is pull-only
- **Always use `source: jira`** in frontmatter so the dashboard shows the Jira badge
- **Always include `jira_key`** for dedup on re-sync
- **Always include `jira_url`** so users can click through to Jira
- **Map status and priority** using the tables above — don't use Jira's raw values
- **If a Jira issue has no description**, use the summary as the failure reason
