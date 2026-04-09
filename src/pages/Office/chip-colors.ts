export const OFFICE_AGENT_CHIP_COLORS = {
  dark: {
    working: {
      background: 'rgba(34, 197, 94, 0.12)',
      border: 'rgba(34, 197, 94, 0.35)',
      text: '#4ade80',
    },
    idle: {
      background: 'rgba(250, 204, 21, 0.14)',
      border: 'rgba(250, 204, 21, 0.35)',
      text: '#facc15',
    },
    neutral: {
      background: 'rgba(100, 116, 139, 0.22)',
      border: 'rgba(148, 163, 184, 0.42)',
      text: '#e2e8f0',
    },
  },
  light: {
    working: {
      background: 'rgba(34, 197, 94, 0.16)',
      border: 'rgba(34, 197, 94, 0.5)',
      text: '#166534',
    },
    idle: {
      background: 'rgba(245, 158, 11, 0.2)',
      border: 'rgba(217, 119, 6, 0.52)',
      text: '#92400e',
    },
    neutral: {
      background: 'rgba(148, 163, 184, 0.18)',
      border: 'rgba(100, 116, 139, 0.44)',
      text: '#1f2937',
    },
  },
} as const;
