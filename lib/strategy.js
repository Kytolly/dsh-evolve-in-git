export function slugify(value) {
    const slug = value
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return slug === '' ? 'untitled' : slug;
}
export function sanitizeSegment(value) {
    return slugify(value);
}
function titleCase(value) {
    return value
        .split(/[-_ ]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}
function formatTags(tags) {
    if (tags === undefined || tags.length === 0)
        return '';
    return tags.map((tag) => `- ${tag}`).join('\n');
}
export function shouldOfferSkillPromotion(record) {
    return record.kind === 'warning'
        || record.kind === 'persona'
        || record.kind === 'note'
        || /error|pitfall|remind|repeat|persona|style|tone/i.test(record.title);
}
export function branchNameForRecord(record) {
    return `evolve/${sanitizeSegment(record.kind)}/${slugify(record.title)}`;
}
export function draftSkillFromRecord(record) {
    const name = `skill-${slugify(record.title)}`;
    const description = `${titleCase(record.kind)} pattern distilled from ${record.title}`;
    const whenToUse = `Use when ${record.content.slice(0, 120).replace(/\s+/g, ' ').trim()}`;
    const instructions = [
        `You are working from the recorded lesson "${record.title}".`,
        '',
        'Follow this reusable rule:',
        record.content.trim(),
        '',
        'If the same pattern reappears, stop and ask whether to update this skill or branch into a new one.',
    ].join('\n');
    return {
        name,
        description,
        whenToUse,
        instructions,
        ...(record.tags === undefined ? {} : { tags: record.tags }),
    };
}
export function renderSkillDraft(draft) {
    const content = [
        '---',
        `name: ${JSON.stringify(draft.name)}`,
        `description: ${JSON.stringify(draft.description)}`,
        `whenToUse: ${JSON.stringify(draft.whenToUse)}`,
        ...(draft.tags === undefined || draft.tags.length === 0 ? [] : [`tags: [${draft.tags.map((tag) => JSON.stringify(tag)).join(', ')}]`]),
        '---',
        '',
        `# ${draft.name}`,
        '',
        '## Instructions',
        '',
        draft.instructions.trim(),
        '',
    ];
    return {
        ...draft,
        path: '',
        content: content.join('\n'),
    };
}
export function suggestEvolution(record) {
    const draft = renderSkillDraft(draftSkillFromRecord(record));
    return {
        question: `把“${record.title}”总结成新的 skill 吗？`,
        rationale: shouldOfferSkillPromotion(record)
            ? 'This looks reusable or repeatable enough to deserve a skill draft.'
            : 'This is a low-friction draft candidate if you want to preserve it as a reusable rule.',
        branchName: branchNameForRecord(record),
        draft,
    };
}
export function memoryPreview(record) {
    const tagLine = formatTags(record.tags);
    return [
        `# ${record.title}`,
        '',
        `- kind: ${record.kind}`,
        record.source === undefined ? undefined : `- source: ${record.source}`,
        tagLine === '' ? undefined : `- tags:\n${tagLine}`,
        '',
        record.content.trim(),
        '',
    ].filter((line) => line !== undefined).join('\n');
}
