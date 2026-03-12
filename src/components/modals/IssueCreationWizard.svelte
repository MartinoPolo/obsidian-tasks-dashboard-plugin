<script lang="ts">
  import type TasksDashboardPlugin from '../../../main';
  import type { DashboardConfig, GitHubIssueMetadata, Priority } from '../../types';
  import NameStep from './NameStep.svelte';
  import WorktreeDecisionStep from './WorktreeDecisionStep.svelte';
  import ColorPicker from './ColorPicker.svelte';
  import PrioritySelector from './PrioritySelector.svelte';

  type WizardStep = 'name' | 'worktree-decision' | 'color' | 'priority';
  type IssueCreationMode = 'standard' | 'worktree';

  interface WorktreeCreationContext {
    eligible: boolean;
    worktreeOriginFolder?: string;
    sourceIssueLinkedRepository?: string;
  }

  interface GitHubSelectionContext {
    githubLink?: string;
    githubMetadata?: GitHubIssueMetadata;
  }

  export interface QuickCreateDefaults {
    priority: Priority;
    color: string;
    worktree: boolean;
    worktreeOriginFolder?: string;
    worktreeBaseRepository?: string;
  }

  interface Props {
    plugin: TasksDashboardPlugin;
    dashboard: DashboardConfig;
    mode?: IssueCreationMode;
    initialIssueName?: string;
    worktreeOriginFolder?: string;
    sourceIssueLinkedRepository?: string;
    githubSelection?: GitHubSelectionContext;
    worktreeContext?: WorktreeCreationContext;
    quickCreateDefaults?: QuickCreateDefaults;
    onclose: () => void;
    oncreate: (request: IssueCreateRequest) => void;
    onsearchopen?: (currentName: string) => void;
    canOpenSearch?: boolean;
  }

  export interface IssueCreateRequest {
    name: string;
    priority: Priority;
    color: string;
    mode: IssueCreationMode;
    worktreeOriginFolder?: string;
    sourceIssueLinkedRepository?: string;
    githubLink?: string;
    githubMetadata?: GitHubIssueMetadata;
  }

  let {
    plugin,
    dashboard,
    mode = 'standard',
    initialIssueName = '',
    worktreeOriginFolder,
    sourceIssueLinkedRepository,
    githubSelection = {},
    worktreeContext,
    quickCreateDefaults,
    onclose,
    oncreate,
    onsearchopen,
    canOpenSearch = false
  }: Props = $props();

  let step: WizardStep = $state('name');
  // svelte-ignore state_referenced_locally
  let issueName: string = $state(initialIssueName);
  let issueColor: string = $state('');
  // svelte-ignore state_referenced_locally
  let currentMode: IssueCreationMode = $state(mode);
  // svelte-ignore state_referenced_locally
  let currentWorktreeOriginFolder: string | undefined = $state(worktreeOriginFolder);
  // svelte-ignore state_referenced_locally
  let currentSourceIssueLinkedRepository: string | undefined = $state(sourceIssueLinkedRepository);

  function handleNameConfirm(name: string): void {
    issueName = name;

    if (quickCreateDefaults !== undefined) {
      oncreate({
        name,
        priority: quickCreateDefaults.priority,
        color: quickCreateDefaults.color,
        mode: quickCreateDefaults.worktree ? 'worktree' : 'standard',
        worktreeOriginFolder: quickCreateDefaults.worktreeOriginFolder,
        sourceIssueLinkedRepository: undefined,
        githubLink: githubSelection.githubLink,
        githubMetadata: githubSelection.githubMetadata
      });
      return;
    }

    if (currentMode === 'standard' && worktreeContext?.eligible === true) {
      step = 'worktree-decision';
      return;
    }

    step = 'color';
  }

  function handleWorktreeDecision(createWorktree: boolean): void {
    if (createWorktree) {
      currentMode = 'worktree';
      currentWorktreeOriginFolder = worktreeContext?.worktreeOriginFolder;
      currentSourceIssueLinkedRepository = worktreeContext?.sourceIssueLinkedRepository;
    } else {
      currentMode = 'standard';
      currentWorktreeOriginFolder = undefined;
      currentSourceIssueLinkedRepository = undefined;
    }
    step = 'color';
  }

  function handleColorSelect(color: string): void {
    issueColor = color;

    if (dashboard.prioritiesEnabled === false) {
      oncreate({
        name: issueName,
        priority: 'low',
        color,
        mode: currentMode,
        worktreeOriginFolder: currentWorktreeOriginFolder,
        sourceIssueLinkedRepository: currentSourceIssueLinkedRepository,
        githubLink: githubSelection.githubLink,
        githubMetadata: githubSelection.githubMetadata
      });
      return;
    }

    step = 'priority';
  }

  function handlePrioritySelect(priority: Priority): void {
    oncreate({
      name: issueName,
      priority,
      color: issueColor,
      mode: currentMode,
      worktreeOriginFolder: currentWorktreeOriginFolder,
      sourceIssueLinkedRepository: currentSourceIssueLinkedRepository,
      githubLink: githubSelection.githubLink,
      githubMetadata: githubSelection.githubMetadata
    });
  }

  function goBackFromStep(): void {
    if (step === 'priority') {
      step = 'color';
      return;
    }

    if (step === 'color') {
      if (currentMode === 'standard' && worktreeContext?.eligible === true) {
        step = 'worktree-decision';
        return;
      }
      step = 'name';
      return;
    }

    if (step === 'worktree-decision') {
      step = 'name';
      return;
    }

    onclose();
  }

  function handleSearchOpen(): void {
    if (onsearchopen !== undefined) {
      onsearchopen(issueName);
    }
  }

  let nameStepTitle = $derived(currentMode === 'worktree' ? 'Worktree Name' : 'Issue Name');
</script>

{#if step === 'name'}
  <NameStep
    title={nameStepTitle}
    initialName={issueName}
    onconfirm={handleNameConfirm}
    oncancel={onclose}
    {onsearchopen}
    {canOpenSearch}
  />
{:else if step === 'worktree-decision'}
  <WorktreeDecisionStep
    onconfirm={handleWorktreeDecision}
    oncancel={onclose}
    onback={goBackFromStep}
  />
{:else if step === 'color'}
  <ColorPicker
    app={plugin.app}
    {plugin}
    {dashboard}
    initialColor={issueColor !== '' ? issueColor : undefined}
    onselect={handleColorSelect}
    oncancel={onclose}
    onback={goBackFromStep}
  />
{:else if step === 'priority'}
  <PrioritySelector
    onselect={handlePrioritySelect}
    oncancel={onclose}
    onback={goBackFromStep}
  />
{/if}
