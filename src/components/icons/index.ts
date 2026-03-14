import TrashIcon from './TrashIcon.svelte';
import ArchiveIcon from './ArchiveIcon.svelte';
import UpIcon from './UpIcon.svelte';
import DownIcon from './DownIcon.svelte';
import SortIcon from './SortIcon.svelte';
import PlusIcon from './PlusIcon.svelte';
import ChevronIcon from './ChevronIcon.svelte';
import FoldAllIcon from './FoldAllIcon.svelte';
import UnfoldAllIcon from './UnfoldAllIcon.svelte';
import UnarchiveIcon from './UnarchiveIcon.svelte';
import ToTopIcon from './ToTopIcon.svelte';
import ToBottomIcon from './ToBottomIcon.svelte';
import RenameIcon from './RenameIcon.svelte';
import PaletteIcon from './PaletteIcon.svelte';
import GithubIcon from './GithubIcon.svelte';
import WorktreeIcon from './WorktreeIcon.svelte';
import PriorityIcon from './PriorityIcon.svelte';
import FolderIcon from './FolderIcon.svelte';
import TerminalIcon from './TerminalIcon.svelte';
import EyeIcon from './EyeIcon.svelte';
import InfoIcon from './InfoIcon.svelte';
import EyeOffIcon from './EyeOffIcon.svelte';
import MoreIcon from './MoreIcon.svelte';
import FileInputIcon from './FileInputIcon.svelte';
import SettingsIcon from './SettingsIcon.svelte';
import RefreshIcon from './RefreshIcon.svelte';
import GitBranchIcon from './GitBranchIcon.svelte';
import RebuildIcon from './RebuildIcon.svelte';
import RefreshCardIcon from './RefreshCardIcon.svelte';
import UnlinkIcon from './UnlinkIcon.svelte';
import PrIcon from './PrIcon.svelte';
import IssueIcon from './IssueIcon.svelte';
import RepoIcon from './RepoIcon.svelte';
import StarIcon from './StarIcon.svelte';
import ForkIcon from './ForkIcon.svelte';
import VscodeIcon from './VscodeIcon.svelte';
import GitPrOpenIcon from './GitPrOpenIcon.svelte';
import GitPrMergedIcon from './GitPrMergedIcon.svelte';
import GitPrClosedIcon from './GitPrClosedIcon.svelte';
import GitPrDraftIcon from './GitPrDraftIcon.svelte';
import GitIssueOpenIcon from './GitIssueOpenIcon.svelte';
import GitIssueClosedIcon from './GitIssueClosedIcon.svelte';
import GitIssueNotPlannedIcon from './GitIssueNotPlannedIcon.svelte';

export {
	TrashIcon,
	ArchiveIcon,
	UpIcon,
	DownIcon,
	SortIcon,
	PlusIcon,
	ChevronIcon,
	FoldAllIcon,
	UnfoldAllIcon,
	UnarchiveIcon,
	ToTopIcon,
	ToBottomIcon,
	RenameIcon,
	PaletteIcon,
	GithubIcon,
	WorktreeIcon,
	PriorityIcon,
	FolderIcon,
	TerminalIcon,
	EyeIcon,
	InfoIcon,
	EyeOffIcon,
	MoreIcon,
	FileInputIcon,
	SettingsIcon,
	RefreshIcon,
	GitBranchIcon,
	RebuildIcon,
	RefreshCardIcon,
	UnlinkIcon,
	PrIcon,
	IssueIcon,
	RepoIcon,
	StarIcon,
	ForkIcon,
	VscodeIcon,
	GitPrOpenIcon,
	GitPrMergedIcon,
	GitPrClosedIcon,
	GitPrDraftIcon,
	GitIssueOpenIcon,
	GitIssueClosedIcon,
	GitIssueNotPlannedIcon
};

export const ICON_COMPONENTS = {
	trash: TrashIcon,
	archive: ArchiveIcon,
	up: UpIcon,
	down: DownIcon,
	sort: SortIcon,
	plus: PlusIcon,
	chevron: ChevronIcon,
	foldAll: FoldAllIcon,
	unfoldAll: UnfoldAllIcon,
	unarchive: UnarchiveIcon,
	toTop: ToTopIcon,
	toBottom: ToBottomIcon,
	rename: RenameIcon,
	palette: PaletteIcon,
	github: GithubIcon,
	worktree: WorktreeIcon,
	priority: PriorityIcon,
	folder: FolderIcon,
	terminal: TerminalIcon,
	eye: EyeIcon,
	info: InfoIcon,
	eyeOff: EyeOffIcon,
	more: MoreIcon,
	fileInput: FileInputIcon,
	settings: SettingsIcon,
	refresh: RefreshIcon,
	gitBranch: GitBranchIcon,
	rebuild: RebuildIcon,
	refreshCard: RefreshCardIcon,
	unlink: UnlinkIcon,
	pr: PrIcon,
	issue: IssueIcon,
	repo: RepoIcon,
	star: StarIcon,
	fork: ForkIcon,
	vscode: VscodeIcon,
	gitPrOpen: GitPrOpenIcon,
	gitPrMerged: GitPrMergedIcon,
	gitPrClosed: GitPrClosedIcon,
	gitPrDraft: GitPrDraftIcon,
	gitIssueOpen: GitIssueOpenIcon,
	gitIssueClosed: GitIssueClosedIcon,
	gitIssueNotPlanned: GitIssueNotPlannedIcon
} as const;

export type IconName = keyof typeof ICON_COMPONENTS;
