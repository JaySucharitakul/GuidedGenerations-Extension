/**
 * Shared group member selection using SillyTavern's built-in buttons dialog.
 * Used by Guided Response and Fun Prompts, including on mobile.
 */
import { debugLog, getContext } from '../persistentGuides/guideExports.js';

function getGroupMembers(context) {
    if (!context?.groupId || !Array.isArray(context.groups)) return [];

    const group = context.groups.find(g => g.id === context.groupId);
    if (!group || !Array.isArray(group.members)) return [];

    const characters = Array.isArray(context.characters) ? context.characters : [];
    const disabled = Array.isArray(group.disabled_members) ? group.disabled_members : [];

    const members = [];
    group.members.forEach((memberAvatar, index) => {
        if (typeof memberAvatar !== 'string') return;
        const chid = characters.findIndex(c => c && c.avatar === memberAvatar);
        if (chid === -1) return;
        const character = characters[chid];
        const name = typeof character.name === 'string' && character.name.length ? character.name : memberAvatar;
        members.push({
            chid,
            name,
            avatar: memberAvatar,
            muted: disabled.includes(memberAvatar),
            triggerArg: String(index),
        });
    });
    return members;
}


/**
 * Return the chosen group member, or null when cancelled/unavailable.
 * Preserve the original group index so numeric and duplicate names can be
 * targeted without interpreting character names as slash-command arguments.
 */
export async function pickGroupMember() {
    const context = getContext();
    if (typeof context?.executeSlashCommandsWithOptions !== 'function') return null;
    const members = getGroupMembers(context);
    if (!members.length) {
        debugLog('[GroupSelection] No group members available; picker skipped.');
        return null;
    }

    // Number labels so even duplicate character names select one exact member.
    const uniqueLabels = members.map((member, index) => `${index + 1}. ${member.name}`);
    const result = await context.executeSlashCommandsWithOptions(
        `/buttons labels=${JSON.stringify(uniqueLabels)} "Select member to respond as"`,
        { showOutput: false, handleExecutionErrors: true }
    );
    const selection = typeof result?.pipe === 'string' ? result.pipe : '';
    const selectedIndex = uniqueLabels.indexOf(selection);
    return selectedIndex >= 0 ? members[selectedIndex] : null;
}
