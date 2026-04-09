export function resolveOfficeAgentChipAvatarSrc(
  agentId: string,
  avatarById: Map<string, string | null>,
): string | null {
  const direct = avatarById.get(agentId);
  if (direct) return direct;

  if (!agentId.startsWith('subagent:')) return null;
  const parentAgentId = agentId.split(':')[1] || '';
  return avatarById.get(parentAgentId) ?? null;
}
