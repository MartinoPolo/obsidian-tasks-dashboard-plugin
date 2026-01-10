# Tasks Dashboard Plugin for Obsidian
Manage high-level project issues with task tracking, progress indicators, and priority-based organization.
## Features
- **Multiple Dashboards**: Configure separate dashboards for different projects
- **Issue Management**: Create, archive, and organize issues with priorities
- **Progress Tracking**: Visual progress bars showing task completion
- **Priority Colors**: Low (green), Medium (yellow), High (red), Top (purple)
- **Tasks Integration**: Automatically generates Obsidian Tasks queries for each issue
- **Quick Actions**: Archive, move up/down, and sort issues directly from the dashboard
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
   npm install
   npm run build
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
4. The plugin will create `dashboard.md` in your root path when you create your first issue
## Usage
### Creating an Issue
1. Press `Ctrl+Shift+E` (default hotkey)
2. If multiple dashboards exist, select one from the list
3. Fill in the issue details:
   - **Issue Name**: Descriptive title
   - **Priority**: Low, Medium, High, or Top
   - **GitHub Link**: Optional link to related GitHub issue
4. Click "Create Issue"
### Dashboard Structure
The dashboard automatically manages two sections:
```markdown
## Active Tasks
[Your active issues with task queries and controls]
## Archive
[Completed/archived issues]
```
Each issue entry includes:
- Link to the issue note
- Embedded tasks query showing up to 10 uncompleted tasks
- Progress bar with completion percentage
- Control buttons (↑ ↓ Archive)
### Issue Notes
Created issues contain:
- YAML frontmatter (created date, status, priority)
- Back link to dashboard
- Issue title
- GitHub link (if provided)
- Tasks section for adding subtasks
### Managing Issues
- **Archive**: Click the "Archive" button to move an issue to the Archive section
- **Reorder**: Use ↑ and ↓ buttons to change issue order
- **Sort**: Use "Sort by Priority" to organize all issues by priority level
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
