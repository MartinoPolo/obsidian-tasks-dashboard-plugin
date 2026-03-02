import { Menu } from 'obsidian';
import { isGitHubWebUrl, parseGitHubUrlInfo } from '../utils/github';
import { parseGitHubRepoFullName } from '../utils/github-url';

export function formatGitHubLinkLabel(url: string): string {
	const parsed = parseGitHubUrlInfo(url);
	if (parsed !== undefined) {
		const labelType = parsed.type === 'pr' ? 'PR' : 'Issue';
		return `${labelType} #${parsed.number}`;
	}

	const repoName = parseGitHubRepoFullName(url);
	if (repoName !== undefined) {
		return `Repository ${repoName}`;
	}

	return url;
}

export function getOpenableGitHubLinks(links: string[]): string[] {
	return links.filter((link) => isGitHubWebUrl(link));
}

export function openGitHubLinkChooser(event: MouseEvent, links: string[]): void {
	const menu = new Menu();
	for (const link of links) {
		menu.addItem((item) => {
			item.setTitle(formatGitHubLinkLabel(link)).onClick(() => {
				window.open(link, '_blank');
			});
		});
	}
	menu.showAtPosition({ x: event.clientX, y: event.clientY });
}
