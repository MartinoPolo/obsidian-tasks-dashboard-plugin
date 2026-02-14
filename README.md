# Tasks Dashboard Plugin for Obsidian
Manage high-level project issues with task tracking, progress indicators, and priority-based organization.
## Features
- **Multiple Dashboards**: Configure separate dashboards for different projects
- **Issue Management**: Create, archive, and organize issues with priorities
- **Progress Tracking**: Visual progress bars with configurable display modes
- **Priority Colors**: Low (green), Medium (yellow), High (red), Top (purple)
- **Tasks Integration**: Automatically generates Obsidian Tasks queries for each issue
- **Quick Actions**: Add Issue, Sort, Archive, and reorder directly from the dashboard
- **Keyboard-Driven**: Sequential prompts at top of screen for fast issue creation
- **Auto-Cursor Positioning**: Opening active issue files automatically places cursor at end for quick task entry
- **GitHub Integration**: Link issues to GitHub issues/PRs with embedded metadata cards
## Installation
### From Source
1. Clone this repository into your vault's `.obsidian/plugins/` folder:
   ```bash
   cd /path/to/your/vault/.obsidian/plugins
   git clone https://github.com/MartinoPolo/obsidian-tasks-dashboard-plugin
   ```
2. Install dependencies and build:
   ```bash
   cd obsidian-tasks-dashboard-plugin
   pnpm install
   pnpm build
   ```
3. Reload Obsidian (Ctrl+R or Cmd+R)
4. Go to Settings → Community Plugins → Enable "Tasks Dashboard"
### Manual Installation
1. Download the latest release
2. Extract `main.js`, `manifest.json`, and `styles.css` to:
   `your-vault/.obsidian/plugins/tasks-dashboard/`
3. Reload Obsidian and enable the plugin
## Configuration
1. Open Settings → Tasks Dashboard
2. Click **+ Add Dashboard**
3. Configure:
   - **Dashboard Name**: Display name for your dashboard
   - **Root Path**: Folder path (e.g., `Projects/MyProject`)
4. Click **Create Files** to generate the dashboard.md and issue folders
5. Optionally configure **Progress Display** mode:
   - Number only (1/5)
   - Percentage only (20%)
   - Progress bar only
   - Number & percentage (1/5 (20%))
   - All (bar + percentage + number)
## Usage
### Creating an Issue
1. Press `Ctrl+Shift+E` or click **Add Issue** button on dashboard
2. If multiple dashboards exist, select one from the list
3. **Step 1**: Type issue name → press Enter
4. **Step 2**: Select priority using ↑↓ arrows → press Enter (Medium preselected)
5. **Step 3**: Type GitHub link (optional) → press Enter to create
6. Issue file opens automatically with cursor ready to add tasks
### Dashboard Structure
The dashboard has four sections:
```markdown
# Active Issues
[Your active issues with task queries and controls]
# Notes
[Free-form notes section]
# Archive
[Completed/archived issues]
# How to Use This Dashboard
[Usage instructions]
```
### Dashboard Buttons
- **Add Issue**: Opens the issue creation flow
- **Sort**: Organizes all issues by priority (or date created/edited)
- **Collapse/Expand All**: Toggle visibility of all issue details
- **Rebuild**: Refresh dashboard from issue files

### Issue Controls
Each issue entry includes:
- Link to the issue note with priority-colored left border
- Progress indicator (configurable display mode)
- Collapse/expand toggle for issue details
- ↑ ↓ buttons to reorder, move to top/bottom
- Archive button and delete button (with confirmation)
- Per-issue color picker, rename, GitHub quick-open
- Folder/terminal/VS Code buttons (when folder assigned)
- Embedded tasks query
### Issue Notes
Created issues contain:
- YAML frontmatter (created date, status, priority)
- Back link to dashboard
- Issue title
- GitHub link (if provided)
- Blank task ready for input

**Auto-cursor**: When you open any active issue file, the cursor automatically positions at the end of the ## Tasks section for quick task entry.
### Managing Issues
- **Archive**: Click the archive icon to move issue to Archive section
- **Delete**: Click the trash icon to permanently delete (with confirmation)
- **Rename**: Right-click issue header or use rename button
- **Reorder**: Use ↑ ↓ buttons or move to top/bottom
- **Sort**: Sort by priority, date created, or date edited
- **Collapse**: Toggle individual issues or collapse/expand all

## GitHub Integration
Link your issues to GitHub issues and pull requests for enhanced tracking.

### Setup
1. Go to Settings → Tasks Dashboard
2. Under **GitHub Authentication**, select "Personal Access Token"
3. Create a token at [GitHub Settings](https://github.com/settings/tokens/new?scopes=repo)
4. Paste the token and click **Test** to verify
5. Choose your preferred **GitHub Display Mode** (Minimal/Compact/Full)

### Per-Dashboard Repository
Optionally link each dashboard to a specific GitHub repository:
1. In the dashboard settings, enter the **GitHub Repository** (e.g., `owner/repo`)
2. When creating issues, suggestions will be filtered to that repository
3. Use the "Search scope" dropdown to choose between Linked repository, My repositories, or All GitHub

### Creating Issues with GitHub Links
When GitHub is configured, step 3 of issue creation shows a rich search modal:
- Recent issues from your linked repo (or all repos)
- Real-time search as you type
- See issue number, title, status, and labels
- Or paste a GitHub URL directly

### Embedded GitHub Cards
Issues linked to GitHub display metadata cards on the dashboard:
- **Minimal**: Issue number and status badge
- **Compact**: Number, title, status, labels, and description preview
- **Full**: All metadata including assignees and timestamps
- Click the refresh icon to update GitHub data

## Project Folder Integration
Link on-disk project folders to your dashboard and individual issues for quick access.

### Global Folder (Dashboard Header)
- Set a global project folder per dashboard in settings or via the **Open Folder** button
- Left-click: opens folder in system explorer (or prompts to set if none)
- Right-click: reassign or clear the folder
- **Terminal** and **VS Code** buttons appear only when a folder is set

### Per-Issue Folders
Each issue can have its own independent folder:
- Folder, terminal, VS Code, and GitHub buttons appear in the issue header row (right side)
- Left-click folder: opens the assigned folder (or prompts to set)
- Right-click folder: reassign or clear
- Terminal and VS Code icons appear only when a folder is assigned
- Issue folders are independent — assigning one does not affect other issues or the global folder

## Hotkeys
Configure custom hotkeys in Settings → Hotkeys:
- Search for "Create Issue" to find per-dashboard commands
- Default: `Ctrl+Shift+E` opens dashboard selector
## Requirements
- Obsidian v0.15.0 or higher
- [Obsidian Tasks Plugin](https://github.com/obsidian-tasks-group/obsidian-tasks) (recommended for task queries)
## File Structure
```
your-project/
├── dashboard.md           # Main dashboard file
└── issues/
    ├── active/           # Active issue notes
    │   ├── issue-1.md
    │   └── issue-2.md
    └── archive/          # Archived issue notes
        └── old-issue.md
```
## License
MIT License - see LICENSE file for details
