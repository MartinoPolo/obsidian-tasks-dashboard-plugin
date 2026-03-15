<script lang="ts">
  import { Menu, Notice } from 'obsidian';
  import type TasksDashboardPlugin from '../../../main';
  import type { DashboardConfig, GitHubIssueMetadata } from '../../types';
  import {
    getGitHubLinkType,
    isGitHubWebUrl,
    type GitHubLinkType
  } from '../../utils/github';
  import { formatGitHubLinkLabel } from '../../utils/github-helpers';
  import ModalLayout from './ModalLayout.svelte';

  interface Props {
    plugin: TasksDashboardPlugin;
    dashboard: DashboardConfig;
    issueId: string;
    initialGithubLinks: string[];
    onclose: () => void;
    onopenGitHubSearch: (
      type: 'issue' | 'pr',
      linkedRepository: string | undefined,
      onResult: (url: string, metadata?: GitHubIssueMetadata) => void
    ) => void;
    onopenRepoPicker: (onResult: (repoFullName: string) => void) => void;
    onopenManualUrl: (
      title: string,
      placeholder: string,
      validate: (url: string) => boolean,
      onResult: (url: string) => void
    ) => void;
  }

  let {
    plugin,
    dashboard,
    issueId,
    initialGithubLinks,
    onclose,
    onopenGitHubSearch,
    onopenRepoPicker,
    onopenManualUrl
  }: Props = $props();

  // svelte-ignore state_referenced_locally
  let githubLinks: string[] = $state([...initialGithubLinks]);
  let hasChanges: boolean = $state(false);

  interface AssignedGitHubLinks {
    issue: string | undefined;
    pr: string | undefined;
    repository: string | undefined;
  }

  function getAssignedLinks(): AssignedGitHubLinks {
    const assigned: AssignedGitHubLinks = {
      issue: undefined,
      pr: undefined,
      repository: undefined
    };
    for (const link of githubLinks) {
      const type = getGitHubLinkType(link);
      if (type === undefined) {
        continue;
      }
      if (assigned[type] === undefined) {
        assigned[type] = link;
      }
    }
    return assigned;
  }

  function getLinkedRepository(): string | undefined {
    const assigned = getAssignedLinks();
    if (assigned.repository === undefined) {
      return undefined;
    }
    return parseGitHubRepoFullName(assigned.repository);
  }

  let assigned = $derived(getAssignedLinks());
  let unknownLinks = $derived(githubLinks.filter((link) => getGitHubLinkType(link) === undefined));

  async function removeLinkByType(type: GitHubLinkType): Promise<void> {
    const linksToRemove = githubLinks.filter((link) => getGitHubLinkType(link) === type);
    for (const link of linksToRemove) {
      await plugin.issueManager.removeGitHubLink(dashboard, issueId, link);
      hasChanges = true;
    }
    githubLinks = githubLinks.filter((link) => getGitHubLinkType(link) !== type);
  }

  async function assignLinkByType(
    type: GitHubLinkType,
    url: string,
    metadata?: GitHubIssueMetadata
  ): Promise<void> {
    await removeLinkByType(type);
    if (!githubLinks.includes(url)) {
      await plugin.issueManager.addGitHubLink(dashboard, issueId, url, metadata);
      hasChanges = true;
      githubLinks = [...githubLinks, url];
    }
  }

  async function handleRemoveLink(url: string): Promise<void> {
    await plugin.issueManager.removeGitHubLink(dashboard, issueId, url);
    githubLinks = githubLinks.filter((link) => link !== url);
    hasChanges = true;
  }

  function openAssignmentMenu(event: MouseEvent, type: GitHubLinkType): void {
    const menu = new Menu();
    menu.addItem((item) => {
      item.setTitle('Pick from GitHub').onClick(() => {
        if (type === 'repository') {
          openRepositoryAssignmentFlow();
          return;
        }
        openIssueOrPrAssignmentFlow(type);
      });
    });
    menu.addItem((item) => {
      item.setTitle('Paste URL manually').onClick(() => {
        openManualAssignmentModal(type);
      });
    });
    menu.showAtPosition({ x: event.clientX, y: event.clientY });
  }

  function openRepositoryAssignmentFlow(): void {
    if (!plugin.githubService.isAuthenticated()) {
      openManualAssignmentModal('repository');
      return;
    }

    void plugin.githubService.getUserRepositories().then((repositories) => {
      if (repositories.length === 0) {
        new Notice('No repositories found. Paste a URL manually.');
        openManualAssignmentModal('repository');
        return;
      }

      onopenRepoPicker((repoFullName) => {
        void assignLinkByType('repository', `https://github.com/${repoFullName}`);
      });
    });
  }

  function openIssueOrPrAssignmentFlow(type: 'issue' | 'pr'): void {
    if (!plugin.githubService.isAuthenticated()) {
      openManualAssignmentModal(type);
      return;
    }

    const linkedRepository = getLinkedRepository();
    onopenGitHubSearch(type, linkedRepository, (url, metadata) => {
      if (url === undefined) {
        return;
      }
      const parsedType = getGitHubLinkType(url);
      if (parsedType !== type) {
        new Notice(`Selected link is not a GitHub ${type.toUpperCase()}.`);
        return;
      }
      void assignLinkByType(type, url, metadata);
    });
  }

  function openManualAssignmentModal(type: GitHubLinkType): void {
    const typeLabel = type === 'pr' ? 'PR' : type === 'issue' ? 'Issue' : 'Repository';
    const placeholder =
      type === 'repository'
        ? 'https://github.com/owner/repo'
        : `https://github.com/owner/repo/${type === 'pr' ? 'pull' : 'issues'}/123`;

    onopenManualUrl(
      `Assign GitHub ${typeLabel}`,
      placeholder,
      (url) => isValidGitHubUrlForType(url, type),
      (url) => {
        void assignLinkByType(type, url);
      }
    );
  }

  function isValidGitHubUrlForType(url: string, type: GitHubLinkType): boolean {
    return getGitHubLinkType(url) === type;
  }

  function handleClose(): void {
    if (hasChanges) {
      new Notice('GitHub links updated.');
    }
    onclose();
  }
</script>

<ModalLayout title="Edit GitHub Links">
  {#snippet children()}
    <div class="tdc-gh-links-list">
      {#snippet typedRow(type: GitHubLinkType, title: string, url: string | undefined)}
        <div class="tdc-gh-links-row">
          {#if url === undefined}
            <div class="tdc-gh-links-label">{title}: Not assigned</div>
          {:else}
            <a class="tdc-gh-links-label" href={url} target="_blank">
              {title}: {formatGitHubLinkLabel(url)}
            </a>
          {/if}

          {#if url !== undefined}
            <button
              class="tdc-prompt-btn tdc-prompt-btn-secondary tdc-gh-links-open"
              onclick={() => window.open(url, '_blank')}
            >
              Open
            </button>
          {/if}

          <button
            class="tdc-prompt-btn tdc-prompt-btn-confirm"
            onclick={(event) => openAssignmentMenu(event, type)}
            oncontextmenu={(event) => { event.preventDefault(); event.stopPropagation(); openAssignmentMenu(event, type); }}
          >
            {url === undefined ? 'Assign' : 'Replace'}
          </button>

          {#if url !== undefined}
            <button
              class="tdc-prompt-btn tdc-prompt-btn-delete tdc-gh-links-remove"
              onclick={() => void removeLinkByType(type)}
            >
              Clear
            </button>
          {/if}
        </div>
      {/snippet}

      {@render typedRow('issue', 'Issue', assigned.issue)}
      {@render typedRow('pr', 'Pull Request', assigned.pr)}
      {@render typedRow('repository', 'Repository', assigned.repository)}
    </div>

    {#if unknownLinks.length > 0}
      <h4>Other links</h4>
      <div class="tdc-gh-links-list">
        {#each unknownLinks as url (url)}
          <div class="tdc-gh-links-row">
            <a class="tdc-gh-links-label" href={url} target="_blank">
              {formatGitHubLinkLabel(url)}
            </a>
            <button
              class="tdc-prompt-btn tdc-prompt-btn-secondary tdc-gh-links-open"
              onclick={() => window.open(url, '_blank')}
            >
              Open
            </button>
            <button
              class="tdc-prompt-btn tdc-prompt-btn-delete tdc-gh-links-remove"
              onclick={() => void handleRemoveLink(url)}
            >
              Remove
            </button>
          </div>
        {/each}
      </div>
    {/if}
  {/snippet}
  {#snippet actions()}
    <button class="tdc-prompt-btn tdc-prompt-btn-cancel" onclick={handleClose}>
      Close <kbd>Esc</kbd>
    </button>
    <button class="tdc-prompt-btn tdc-prompt-btn-confirm" onclick={handleClose}>
      Confirm <kbd>↵</kbd>
    </button>
  {/snippet}
</ModalLayout>
