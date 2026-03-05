const HOW_TO_HEADER = '# How to Use This Dashboard';

const HOW_TO_BULLETS = [
	'- Press "+ Add issue" or keyboard shortcut (set your hotkey in settings)',
	'- Use Row 1 actions in each issue header; hidden actions are available in the always-visible 3-dots menu',
	'- Use overflow "Layout settings" to configure dashboard-wide Row 1/Row 2 action placement and show/hide actions',
	'- Use ↑/↓ to reorder quickly; right-click ↑ for move-to-top and right-click ↓ for move-to-bottom',
	'- Use archive to move issues to Archive, and use delete/rename/recolor/folder link actions as needed',
	'- Terminal and VS Code actions require an assigned issue folder',
	'- This How to Use section is optional and can be removed if you prefer',
	'- Add tasks in issue notes using `- [ ] Task name`'
] as const;

export const buildHowToSection = (): string => {
	return `${HOW_TO_HEADER}\n${HOW_TO_BULLETS.join('\n')}`;
};
