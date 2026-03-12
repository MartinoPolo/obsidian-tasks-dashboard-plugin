<script lang="ts">
  import { Setting } from 'obsidian';
  import type TasksDashboardPlugin from '../../../main';
  import { addDropdownOptions, isNonEmptyString } from '../../settings/settings-helpers';
  import {
    GITHUB_AUTH_METHOD_OPTIONS,
    GITHUB_DISPLAY_MODE_OPTIONS,
    GITHUB_TOKEN_CREATION_URL,
    isGitHubAuthMethod,
    isGitHubDisplayMode
  } from '../../settings/settings-options';

  interface Props {
    plugin: TasksDashboardPlugin;
    onrefresh: () => void;
  }

  let { plugin, onrefresh }: Props = $props();

  let headingEl: HTMLElement | undefined = $state(undefined);
  let authSettingEl: HTMLElement | undefined = $state(undefined);
  let authStatusEl: HTMLElement | undefined = $state(undefined);
  let rateLimitEl: HTMLElement | undefined = $state(undefined);
  let tokenSettingEl: HTMLElement | undefined = $state(undefined);
  let displayModeEl: HTMLElement | undefined = $state(undefined);

  let settings = $derived(plugin.settings);
  let showTokenField = $derived(settings.githubAuth.method === 'pat');

  function saveSettings(): void {
    void plugin.saveSettings();
  }

  function saveSettingsAndRefreshDashboard(): void {
    saveSettings();
    plugin.triggerDashboardRefresh();
  }

  function updateRateLimitDisplay(): void {
    if (rateLimitEl === undefined) {
      return;
    }

    rateLimitEl.empty();
    const currentRateLimit = plugin.githubService.getRateLimit();
    if (currentRateLimit === undefined) {
      return;
    }

    const resetDate = new Date(currentRateLimit.resetTimestamp * 1000);
    const now = new Date();
    const minutesUntilReset = Math.max(
      0,
      Math.ceil((resetDate.getTime() - now.getTime()) / 60000)
    );

    const isLow = currentRateLimit.remaining < currentRateLimit.limit * 0.1;
    const statusClass = isLow ? 'tdc-rate-limit-low' : 'tdc-rate-limit-ok';

    const rateLimitContainer = rateLimitEl.createDiv({
      cls: `tdc-rate-limit-info ${statusClass}`
    });
    rateLimitContainer.createSpan({
      text: `API rate limit: ${currentRateLimit.remaining}/${currentRateLimit.limit} remaining`
    });
    rateLimitContainer.createSpan({
      cls: 'tdc-rate-limit-reset',
      text: minutesUntilReset > 0 ? ` (resets in ${minutesUntilReset}m)` : ' (resets now)'
    });
  }

  async function updateAuthStatus(): Promise<void> {
    if (authStatusEl === undefined) {
      return;
    }

    authStatusEl.empty();
    if (settings.githubAuth.method === 'pat' && isNonEmptyString(settings.githubAuth.token)) {
      authStatusEl.createSpan({ cls: 'tdc-auth-checking', text: 'Checking connection...' });
      const result = await plugin.githubService.validateToken();
      authStatusEl.empty();
      if (result.valid) {
        authStatusEl.createSpan({
          cls: 'tdc-auth-connected',
          text: `Connected as @${result.username}`
        });
        updateRateLimitDisplay();
      } else {
        authStatusEl.createSpan({
          cls: 'tdc-auth-error',
          text:
            result.error !== undefined && result.error !== ''
              ? result.error
              : 'Authentication failed'
        });
      }
    } else {
      authStatusEl.createSpan({ cls: 'tdc-auth-none', text: 'Not connected' });
    }
  }

  $effect(() => {
    if (headingEl === undefined) {
      return;
    }

    headingEl.empty();
    headingEl.createEl('h3', { text: 'GitHub integration' });
  });

  $effect(() => {
    if (authSettingEl === undefined) {
      return;
    }

    authSettingEl.empty();
    new Setting(authSettingEl)
      .setName('GitHub authentication')
      .setDesc('Connect to GitHub to enable issue search and metadata display')
      .addDropdown((dropdown) => {
        addDropdownOptions(dropdown, GITHUB_AUTH_METHOD_OPTIONS);
        dropdown.setValue(settings.githubAuth.method).onChange((value) => {
          if (!isGitHubAuthMethod(value)) {
            return;
          }

          settings.githubAuth.method = value;
          if (value === 'none') {
            settings.githubAuth.token = undefined;
            plugin.githubService.setAuth({ method: 'none' });
          }

          saveSettingsAndRefreshDashboard();
          onrefresh();
        });
      });
  });

  $effect(() => {
    if (authStatusEl === undefined) {
      return;
    }

    void updateAuthStatus();
  });

  $effect(() => {
    if (tokenSettingEl === undefined || !showTokenField) {
      return;
    }

    tokenSettingEl.empty();
    const tokenSetting = new Setting(tokenSettingEl)
      .setName('Personal access token')
      .setDesc('Create a personal access token in GitHub settings.');

    tokenSetting.addText((text) => {
      text.inputEl.type = 'password';
      text.inputEl.addClass('tdc-token-input');
      text.setPlaceholder('GitHub personal access token')
        .setValue(settings.githubAuth.token ?? '')
        .onChange((value) => {
          settings.githubAuth.token = value;
          plugin.githubService.setAuth(settings.githubAuth);
          saveSettingsAndRefreshDashboard();
        });
    });

    tokenSetting.addButton((btn) =>
      btn.setButtonText('Test').onClick(() => {
        void updateAuthStatus();
      })
    );

    tokenSetting.addExtraButton((btn) =>
      btn
        .setIcon('external-link')
        .setTooltip('Create new token on GitHub')
        .onClick(() => {
          window.open(GITHUB_TOKEN_CREATION_URL, '_blank');
        })
    );
  });

  $effect(() => {
    if (displayModeEl === undefined) {
      return;
    }

    displayModeEl.empty();
    new Setting(displayModeEl)
      .setName('GitHub display mode')
      .setDesc('How much GitHub issue detail to show on the dashboard')
      .addDropdown((dropdown) => {
        addDropdownOptions(dropdown, GITHUB_DISPLAY_MODE_OPTIONS);
        dropdown.setValue(settings.githubDisplayMode).onChange((value) => {
          if (!isGitHubDisplayMode(value)) {
            return;
          }

          settings.githubDisplayMode = value;
          saveSettingsAndRefreshDashboard();
        });
      });
  });
</script>

<div bind:this={headingEl}></div>
<div bind:this={authSettingEl}></div>
<div bind:this={authStatusEl} class="tdc-github-auth-status"></div>
<div bind:this={rateLimitEl} class="tdc-github-rate-limit"></div>
{#if showTokenField}
  <div bind:this={tokenSettingEl}></div>
{/if}
<div bind:this={displayModeEl}></div>
