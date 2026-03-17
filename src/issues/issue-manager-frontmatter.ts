import { escapeForRegExp } from './issue-manager-shared';

export function quoteYamlString(value: string): string {
	return `'${value.replace(/'/g, "''")}'`;
}

export function getFrontmatter(content: string): string | undefined {
	const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
	if (frontmatterMatch === null) {
		return undefined;
	}

	return frontmatterMatch[1];
}

export function getFrontmatterStringField(content: string, fieldName: string): string | undefined {
	const frontmatter = getFrontmatter(content);
	if (frontmatter === undefined) {
		return undefined;
	}

	const escapedFieldName = escapeForRegExp(fieldName);
	const fieldRegex = new RegExp(`^${escapedFieldName}:\\s*(.+)\\s*$`, 'm');
	const fieldMatch = frontmatter.match(fieldRegex);
	if (fieldMatch === null) {
		return undefined;
	}

	const rawValue = fieldMatch[1].trim();
	const singleQuotedMatch = rawValue.match(/^'(.*)'$/);
	if (singleQuotedMatch !== null) {
		return singleQuotedMatch[1].replace(/''/g, "'");
	}

	const doubleQuotedMatch = rawValue.match(/^"(.*)"$/);
	if (doubleQuotedMatch !== null) {
		return doubleQuotedMatch[1].replace(/\\"/g, '"');
	}

	return rawValue;
}

export function upsertFrontmatterField(
	content: string,
	fieldName: string,
	rawValue: string
): string {
	const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
	if (frontmatterMatch === null) {
		return content;
	}

	const frontmatterBody = frontmatterMatch[1];
	const escapedFieldName = escapeForRegExp(fieldName);
	const fieldPattern = new RegExp(`^${escapedFieldName}:\\s*.*$`, 'm');
	const updatedFrontmatterBody = fieldPattern.test(frontmatterBody)
		? frontmatterBody.replace(fieldPattern, `${fieldName}: ${rawValue}`)
		: `${frontmatterBody}\n${fieldName}: ${rawValue}`;
	const updatedFrontmatter = `---\n${updatedFrontmatterBody}\n---`;

	return updatedFrontmatter + content.slice(frontmatterMatch[0].length);
}
