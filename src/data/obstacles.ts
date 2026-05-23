import { ObstacleInfo, ThemeConfig } from '../types';

export const OBSTACLES_DATA: Record<string, ObstacleInfo> = {
  HIPPO: {
    type: 'HIPPO',
    name: 'HiPPO',
    acronym: "Highest Paid Person's Opinion",
    fullName: "Highest Paid Person's Opinion (HiPPO)",
    emoji: '🦛',
    color: 'from-emerald-400 to-teal-600',
    lightColor: 'bg-emerald-950/40',
    textColor: 'text-emerald-300',
    borderColor: 'border-emerald-500/30',
    pmConcept: 'A senior leader whose gut-driven opinions and executive mandates override customer data, user research, and strategic alignment, causing the team to pivot mindlessly based on status rather than validation.',
    sarcasticQuote: '"I don\'t need data, I\'ve been in this industry for 20 years and my gut is never wrong! Stop wasting time with A/B testing and build this rotating 3D carousel by Monday."'
  },
  ZEBRA: {
    type: 'ZEBRA',
    name: 'ZEbRA',
    acronym: 'Zero Evidence But Really Arrogant',
    fullName: 'Zero Evidence But Really Arrogant (ZEbRA)',
    emoji: '🦓',
    color: 'from-amber-400 to-orange-600',
    lightColor: 'bg-amber-950/40',
    textColor: 'text-amber-300',
    borderColor: 'border-amber-500/30',
    pmConcept: 'A stakeholder or expert who pushes unvalidated ideas and cognitive biases with absolute confidence, aggressively dismissing requests for metrics or customer feedback.',
    sarcasticQuote: '"It is completely obvious that users want this blockchain-enabled chatbot! Trust me, it\'s a game changer. I don\'t need "surveys" to tell me what our vision is."'
  },
  WOLF: {
    type: 'WOLF',
    name: 'WoLF',
    acronym: 'Works on Latest Fire',
    fullName: 'Works on Latest Fire (WoLF)',
    emoji: '🐺',
    color: 'from-red-400 to-rose-600',
    lightColor: 'bg-rose-950/40',
    textColor: 'text-rose-300',
    borderColor: 'border-rose-500/30',
    pmConcept: 'A manager or team that constantly abandons long-term strategic roadmaps to chase every immediate minor bug, support ticket, or sudden squeaky wheel, resulting in severe technical debt and constant context switching.',
    sarcasticQuote: '"STOP the sprint! A user in Idaho complained that the footer link is 2 pixels off-center! Everyone, drop your scaling projects and join this 14-person emergency war room! All hands on deck!"'
  },
  RHINO: {
    type: 'RHINO',
    name: 'RHiNO',
    acronym: 'Really High-value New Opportunity',
    fullName: 'Really High-value New Opportunity (RHiNO)',
    emoji: '🦏',
    color: 'from-fuchsia-400 to-purple-600',
    lightColor: 'bg-fuchsia-950/40',
    textColor: 'text-fuchsia-300',
    borderColor: 'border-fuchsia-500/30',
    pmConcept: 'A shiny, unvetted feature or custom integration pitched by sales/stakeholders that promises huge revenue, completely derailing current sprints and bloating the core product for a single prospect.',
    sarcasticQuote: '"If we just build a custom multi-tenant mainframe bridge for this single prospect, they promised to sign a contract! Yes, it breaks our entire product architecture, but it\'s a Really High-value New Opportunity!"'
  },
  SEAGULL: {
    type: 'SEAGULL',
    name: 'Seagull Manager',
    acronym: 'Seagulls (Swoop, Squawk, and Leave)',
    fullName: 'Seagull Manager',
    emoji: '🦅',
    color: 'from-sky-400 to-blue-600',
    lightColor: 'bg-sky-950/40',
    textColor: 'text-sky-300',
    borderColor: 'border-sky-500/30',
    pmConcept: 'A manager who is rarely involved, but periodically parachutes into active projects unexpected, squawks loud complaints, creates complete chaos by demanding changes, defames team progress, and quickly flies away.',
    sarcasticQuote: '"This entire UX dashboard is wrong! Why did we choose blue? Who authorized this flow? I don\'t have time to look at your research papers, just rewrite it before the client demo. Bye, going to my executive golf retreat!"'
  }
};

export const THEMES: ThemeConfig[] = [
  {
    id: 'forest',
    name: 'Fantasy Office Forest',
    skyGradient: ['#1e1b4b', '#311042'],
    groundColor: '#14532d', // Deep mossy forest green
    midgroundColor: '#166534', // Mid-tone foliage
    foregroundColor: '#22c55e', // Vibrant grass
    accentColor: '#ec4899', // Pink unicorn trails
    levelName: 'Level 1: The Jungle of Executive Mandates'
  },
  {
    id: 'desert',
    name: 'Dry Whiteboard Desert',
    skyGradient: ['#3c1010', '#1c0c0c'],
    groundColor: '#78350f', // Sand amber
    midgroundColor: '#92400e', // Sticky-note amber dunes
    foregroundColor: '#f59e0b', // Glowing desert dust
    accentColor: '#38bdf8', // Blue marker ink
    levelName: 'Level 2: The Barren Dunes of No Evidence'
  },
  {
    id: 'beach',
    name: 'Sprint Burndown Beach',
    skyGradient: ['#0d2232', '#061324'],
    groundColor: '#1e3a8a', // Deep wave ocean blue
    midgroundColor: '#2563eb', // Mid ocean tide
    foregroundColor: '#06b6d4', // Cyan surf splashing
    accentColor: '#fbbf24', // Sun flare
    levelName: 'Level 3: The Tides of Shiny Opportunities'
  }
];

export function getThemeForLevel(score: number): ThemeConfig {
  if (score >= 1200) {
    return THEMES[2]; // Beach
  }
  if (score >= 500) {
    return THEMES[1]; // Desert
  }
  return THEMES[0]; // Forest
}
