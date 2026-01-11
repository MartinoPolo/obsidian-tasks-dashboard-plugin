# Tasks Dashboard Plugin for Obsidian
Manage high-level project issues with task tracking, progress indicators, and priority-based organization.
## Features
- **Multiple Dashboards**: Configure separate dashboards for different projects
- **Issue Management**: Create, archive, and organize issues with priorities
- **Progress Tracking**: Visual progress bars with configurable display modes
- **Priority Colors**: Low (green), Medium (yellow), High (red), Top (purple)
- **Tasks Integration**: Automatically generates Obsidian Tasks queries for each issue
- **Quick Actions**: Add Issue, Sort, Refresh, Archive, and reorder directly from the dashboard
- **Keyboard-Driven**: Sequential prompts at top of screen for fast issue creation
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
- **Sort**: Organizes all issues by priority level
- **Refresh**: Manually updates progress counts
### Issue Controls
Each issue entry includes:
- Link to the issue note with priority-colored left border
- Progress indicator (configurable display mode)
- ↑ ↓ buttons to reorder
- Archive button (trash icon)
- Embedded tasks query
### Issue Notes
Created issues contain:
- YAML frontmatter (created date, status, priority)
- Back link to dashboard
- Issue title
- GitHub link (if provided)
- Blank task ready for input
### Managing Issues
- **Archive**: Click the trash icon to archive an issue
- **Reorder**: Use ↑ and ↓ buttons to change issue order
- **Sort**: Use "Sort" button to organize all issues by priority
- **Refresh**: Click "Refresh" to manually update progress counts
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
