import { App, Notice, TAbstractFile, TFile } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { DashboardConfig, PRIORITY_ORDER } from '../types';
import { hasMarkers, initializeDashboardStructure, MARKERS } from './DashboardParser';
import { getDashboardPath } from '../utils/dashboard-path';
import { ISSUE_ACTIVE_FOLDER, ISSUE_ARCHIVE_FOLDER, ISSUE_SECTION_ROOT } from './dashboard-writer-constants';
import {
buildIssueMarkdownBlock,
createIssueIdToBlockMap,
escapeRegExp,
extractAndRemoveIssueBlock,
extractNotesSection,
insertBeforeMarker,
parseYamlFrontmatter,
removeLegacyIssueSeparator,
toIssueBlockParams
} from './dashboard-writer-helpers';
import {
getActiveIssueBlocksFromDashboard,
rebuildActiveSectionWithSortedBlocks,
sortByDateField as getSortedBlocksByDateField
} from './dashboard-writer-active-section';
import { buildRebuiltDashboardContent, scanIssueFilesForRebuilding } from './dashboard-writer-rebuild';

export type { DashboardWriterInstance, SortDirection } from './dashboard-writer-types';
import type { DashboardWriterInstance } from './dashboard-writer-types';

export function createDashboardWriter(app: App, plugin: TasksDashboardPlugin): DashboardWriterInstance {
const resolveFileByPath = (path: string): TFile | undefined => {
const abstractFile: TAbstractFile | null = app.vault.getAbstractFileByPath(path);
if (abstractFile instanceof TFile) {
return abstractFile;
}

return undefined;
};

const getDashboardFile = (dashboard: DashboardConfig): TFile | undefined => {
return resolveFileByPath(getDashboardPath(dashboard));
};

const moveIssueBetweenSections = async (
dashboard: DashboardConfig,
issueId: string,
targetSectionEndMarker: string,
pathFromFolder: string,
pathToFolder: string
): Promise<void> => {
const file = getDashboardFile(dashboard);
if (file === undefined) {
return;
}

const content = await app.vault.read(file);
const result = extractAndRemoveIssueBlock(content, issueId);
if (result === undefined) {
return;
}

const fromPath = `${ISSUE_SECTION_ROOT}/${pathFromFolder}`;
const toPath = `${ISSUE_SECTION_ROOT}/${pathToFolder}`;
const updatedBlock = removeLegacyIssueSeparator(
result.block.replace(new RegExp(escapeRegExp(fromPath), 'g'), toPath)
);

const inserted = insertBeforeMarker(
result.cleanedContent,
targetSectionEndMarker,
`${updatedBlock}\n`
);
if (inserted === undefined) {
return;
}

await app.vault.modify(file, inserted);
};

const readCreatedDateForIssue = async (filePath: string): Promise<number> => {
const file = app.vault.getAbstractFileByPath(filePath);
if (!(file instanceof TFile)) {
return 0;
}

const content = await app.vault.read(file);
const frontmatter = parseYamlFrontmatter(content);
const createdValue = frontmatter['created'];

if (!createdValue) {
return 0;
}

const timestamp = new Date(createdValue).getTime();
return Number.isNaN(timestamp) ? 0 : timestamp;
};

const sortByCreatedDate: DashboardWriterInstance['sortByCreatedDate'] = async (
dashboard,
direction
) => {
const label = direction === 'newest' ? 'newest first' : 'oldest first';
const dashboardData = await getActiveIssueBlocksFromDashboard(app, dashboard, getDashboardFile);
if (dashboardData === undefined || dashboardData.issues.length < 2) {
return;
}

const sortedBlocks = await getSortedBlocksByDateField(
dashboardData,
direction,
(issue) => readCreatedDateForIssue(issue.filePath)
);

await rebuildActiveSectionWithSortedBlocks(
app,
dashboard,
getDashboardFile,
sortedBlocks,
`Issues sorted by created date (${label})`
);
};

const sortByEditedDate: DashboardWriterInstance['sortByEditedDate'] = async (
dashboard,
direction
) => {
const label = direction === 'newest' ? 'recently edited' : 'least recently edited';
const dashboardData = await getActiveIssueBlocksFromDashboard(app, dashboard, getDashboardFile);
if (dashboardData === undefined || dashboardData.issues.length < 2) {
return;
}

const sortedBlocks = await getSortedBlocksByDateField(dashboardData, direction, (issue) => {
const issueFile = app.vault.getAbstractFileByPath(issue.filePath);
return issueFile instanceof TFile ? issueFile.stat.mtime : 0;
});

await rebuildActiveSectionWithSortedBlocks(
app,
dashboard,
getDashboardFile,
sortedBlocks,
`Issues sorted by ${label}`
);
};

const addIssueToDashboard: DashboardWriterInstance['addIssueToDashboard'] = async (
dashboard,
issue
) => {
const dashboardPath = getDashboardPath(dashboard);
let file = getDashboardFile(dashboard);

if (file === undefined) {
const content = initializeDashboardStructure(dashboard.id);
await app.vault.create(dashboardPath, content);
file = getDashboardFile(dashboard);

if (file === undefined) {
throw new Error(`Failed to create dashboard file at ${dashboardPath}`);
}
}

let content = await app.vault.read(file);
if (!hasMarkers(content)) {
content = initializeDashboardStructure(dashboard.id);
}

const issueEntry = buildIssueMarkdownBlock(toIssueBlockParams(issue, dashboard));
const inserted = insertBeforeMarker(content, MARKERS.ACTIVE_END, `${issueEntry}\n`);
if (inserted === undefined) {
throw new Error('Dashboard structure is invalid');
}

await app.vault.modify(file, inserted);
};

const moveIssueToArchive: DashboardWriterInstance['moveIssueToArchive'] = async (
dashboard,
issueId
) => {
await moveIssueBetweenSections(
dashboard,
issueId,
MARKERS.ARCHIVE_END,
ISSUE_ACTIVE_FOLDER,
ISSUE_ARCHIVE_FOLDER
);
};

const moveIssueToActive: DashboardWriterInstance['moveIssueToActive'] = async (
dashboard,
issueId
) => {
await moveIssueBetweenSections(
dashboard,
issueId,
MARKERS.ACTIVE_END,
ISSUE_ARCHIVE_FOLDER,
ISSUE_ACTIVE_FOLDER
);
};

const removeIssueFromDashboard: DashboardWriterInstance['removeIssueFromDashboard'] = async (
dashboard,
issueId
) => {
const file = getDashboardFile(dashboard);
if (file === undefined) {
return;
}

const content = await app.vault.read(file);
const result = extractAndRemoveIssueBlock(content, issueId);
if (result === undefined) {
return;
}

await app.vault.modify(file, result.cleanedContent);
};

const moveIssue: DashboardWriterInstance['moveIssue'] = async (dashboard, issueId, direction) => {
const dashboardData = await getActiveIssueBlocksFromDashboard(app, dashboard, getDashboardFile);
if (dashboardData === undefined) {
return;
}

const { file, content, issues } = dashboardData;
const issueIndex = issues.findIndex((issue) => issue.id === issueId);
if (issueIndex === -1) {
return;
}

const swapIndex = direction === 'up' ? issueIndex - 1 : issueIndex + 1;
if (swapIndex < 0 || swapIndex >= issues.length) {
return;
}

const currentIssue = issues[issueIndex];
const swapIssue = issues[swapIndex];
const currentBlock = content.substring(currentIssue.startIndex, currentIssue.endIndex);
const swapBlock = content.substring(swapIssue.startIndex, swapIssue.endIndex);

let updatedContent: string;
if (direction === 'up') {
updatedContent =
content.slice(0, swapIssue.startIndex) +
currentBlock +
content.slice(swapIssue.endIndex, currentIssue.startIndex) +
swapBlock +
content.slice(currentIssue.endIndex);
} else {
updatedContent =
content.slice(0, currentIssue.startIndex) +
swapBlock +
content.slice(currentIssue.endIndex, swapIssue.startIndex) +
currentBlock +
content.slice(swapIssue.endIndex);
}

await app.vault.modify(file, updatedContent);
};

const moveIssueToPosition: DashboardWriterInstance['moveIssueToPosition'] = async (
dashboard,
issueId,
position
) => {
const dashboardData = await getActiveIssueBlocksFromDashboard(app, dashboard, getDashboardFile);
if (dashboardData === undefined) {
return;
}

const { content, issues } = dashboardData;
if (issues.length < 2) {
return;
}

const issueIndex = issues.findIndex((issue) => issue.id === issueId);
if (issueIndex === -1) {
return;
}

const isAlreadyAtTarget =
(position === 'top' && issueIndex === 0) ||
(position === 'bottom' && issueIndex === issues.length - 1);
if (isAlreadyAtTarget) {
return;
}

const issueIdToBlock = createIssueIdToBlockMap(content, issues);
const targetIssue = issues[issueIndex];
const targetBlock = issueIdToBlock.get(targetIssue.id);
if (targetBlock === undefined) {
return;
}

const remainingBlocks: string[] = [];
for (const issue of issues) {
if (issue.id === issueId) {
continue;
}

const block = issueIdToBlock.get(issue.id);
if (block !== undefined) {
remainingBlocks.push(block);
}
}

const sortedBlocks =
position === 'top'
? [targetBlock, ...remainingBlocks]
: [...remainingBlocks, targetBlock];

await rebuildActiveSectionWithSortedBlocks(
app,
dashboard,
getDashboardFile,
sortedBlocks,
`Issue moved to ${position}`
);
};

const sortByPriority: DashboardWriterInstance['sortByPriority'] = async (dashboard) => {
const dashboardData = await getActiveIssueBlocksFromDashboard(app, dashboard, getDashboardFile);
if (dashboardData === undefined) {
return;
}

const { content, issues } = dashboardData;
if (issues.length < 2) {
return;
}

const sortedIssues = [...issues].sort(
(a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
);

const issueIdToBlock = createIssueIdToBlockMap(content, issues);
const sortedBlocks = sortedIssues
.map((issue) => issueIdToBlock.get(issue.id))
.filter((block): block is string => block !== undefined);

await rebuildActiveSectionWithSortedBlocks(
app,
dashboard,
getDashboardFile,
sortedBlocks,
'Issues sorted by priority'
);
};

const rebuildDashboardFromFiles: DashboardWriterInstance['rebuildDashboardFromFiles'] = async (
dashboard
) => {
if (dashboard.githubEnabled && plugin.githubService.isAuthenticated()) {
plugin.githubService.clearCache();
}

const { activeIssues, archivedIssues } = await scanIssueFilesForRebuilding(app, dashboard);
const dashboardPath = getDashboardPath(dashboard);
const existingFile = getDashboardFile(dashboard);

let notesContent = '';
if (existingFile !== undefined) {
const existingContent = await app.vault.read(existingFile);
notesContent = extractNotesSection(existingContent);
}

const newContent = buildRebuiltDashboardContent(
dashboard,
activeIssues,
archivedIssues,
notesContent
);
if (existingFile !== undefined) {
await app.vault.modify(existingFile, newContent);
} else {
await app.vault.create(dashboardPath, newContent);
}

const issueCount = activeIssues.length + archivedIssues.length;
new Notice(`Dashboard rebuilt with ${issueCount} issues`);
return issueCount;
};

return {
addIssueToDashboard,
moveIssueToArchive,
moveIssueToActive,
removeIssueFromDashboard,
moveIssue,
moveIssueToPosition,
sortByPriority,
sortByCreatedDate,
sortByEditedDate,
rebuildDashboardFromFiles
};
}
