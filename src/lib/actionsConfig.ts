import { SportType, ActionType, PointType, OTHER_ACTION_KEYS } from '@/types/sports';
import { getCurrentUserId, patchCloudSettings } from './cloudSettings';

const STORAGE_KEY = 'myvolley-actions-config';

export interface CustomAction {
  id: string;
  label: string;
  sport: SportType;
  category: PointType; // 'scored', 'fault' or 'neutral'
  points?: number; // For basketball scored actions: 1, 2 or 3
  sigil?: string; // Max 2 chars for neutral court display
  showOnCourt?: boolean; // Whether to display neutral point on court
  assignToPlayer?: boolean; // Whether to show player selector for this action
  /** Whether this action requires a direction (2-click: origin + destination) */
  hasDirection?: boolean;
  /** Whether we prompt for action quality rating (positive / neutral / negative) */
  hasRating?: boolean;
}

export interface ActionsConfig {
  /** Action keys that are hidden (not shown in match UI) — includes custom action IDs */
  hiddenActions: string[];
  /** User-created custom actions */
  customActions: CustomAction[];
  /** Overrides for predefined/default actions (e.g., hasRating, assignToPlayer, hasDirection) */
  defaultActionsConfig?: Record<string, Partial<Omit<CustomAction, 'id' | 'sport' | 'category' | 'label' | 'points'>>>;
}

function getConfig(): ActionsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultConfig();
    return JSON.parse(raw);
  } catch {
    return getDefaultConfig();
  }
}

function getDefaultConfig(): ActionsConfig {
  return {
    // "Other" actions hidden by default
    hiddenActions: [
      'other_offensive', 'other_volley_fault', 'other_volley_neutral',
      'other_tennis_winner', 'other_tennis_fault',
      'other_padel_winner', 'other_padel_fault',
      'other_basket_fault',
    ],
    customActions: [],
    defaultActionsConfig: {},
  };
}

function saveConfig(config: ActionsConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  // Fire-and-forget cloud sync
  syncActionsToCloud(config);
}

/** Sync actions config to cloud if user is logged in */
async function syncActionsToCloud(config: ActionsConfig) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;
    await patchCloudSettings(userId, {
      customActions: config.customActions,
      hiddenActions: config.hiddenActions,
      defaultActionsConfig: config.defaultActionsConfig,
    });
  } catch {
    // Silent fail — localStorage is source of truth for current session
  }
}

export function getActionsConfig(): ActionsConfig {
  return getConfig();
}

/** Overwrite local config from cloud data (used during hydration) */
export function hydrateActionsConfig(cloud: { customActions?: CustomAction[]; hiddenActions?: string[]; defaultActionsConfig?: Record<string, any> }) {
  const local = getConfig();
  const merged: ActionsConfig = {
    hiddenActions: cloud.hiddenActions ?? local.hiddenActions,
    customActions: cloud.customActions ?? local.customActions,
    defaultActionsConfig: cloud.defaultActionsConfig ?? local.defaultActionsConfig ?? {},
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}

export function toggleActionVisibility(actionKey: string): ActionsConfig {
  const config = getConfig();
  const idx = config.hiddenActions.indexOf(actionKey);
  if (idx >= 0) {
    config.hiddenActions.splice(idx, 1);
  } else {
    config.hiddenActions.push(actionKey);
  }
  saveConfig(config);
  return config;
}

export function addCustomAction(
  label: string, sport: SportType, category: PointType,
  points?: number, sigil?: string, showOnCourt?: boolean, assignToPlayer?: boolean, hasDirection?: boolean, hasRating?: boolean
): ActionsConfig {
  const config = getConfig();
  config.customActions.push({
    id: crypto.randomUUID(),
    label: label.trim(),
    sport,
    category,
    ...(points != null && { points }),
    ...(sigil ? { sigil: sigil.slice(0, 2).toUpperCase() } : {}),
    showOnCourt: hasDirection ? true : (showOnCourt ?? (category === 'neutral' ? false : true)),
    assignToPlayer: assignToPlayer ?? true,
    ...(hasDirection ? { hasDirection: true } : {}),
    ...(hasRating ? { hasRating: true } : {}),
  });
  saveConfig(config);
  return config;
}

export function updateCustomAction(id: string, newLabel: string, points?: number, sigil?: string, showOnCourt?: boolean, assignToPlayer?: boolean, hasDirection?: boolean, hasRating?: boolean): ActionsConfig {
  const config = getConfig();
  const action = config.customActions.find(a => a.id === id);
  if (action) {
    action.label = newLabel.trim();
    if (action.sport === 'basketball' && action.category === 'scored') {
      action.points = points;
    }
    if (sigil !== undefined) action.sigil = sigil.slice(0, 2).toUpperCase();
    if (hasDirection !== undefined) action.hasDirection = hasDirection;
    if (hasDirection) {
      action.showOnCourt = true;
    } else if (showOnCourt !== undefined) {
      action.showOnCourt = showOnCourt;
    }
    if (assignToPlayer !== undefined) action.assignToPlayer = assignToPlayer;
    if (hasRating !== undefined) action.hasRating = hasRating;
  }
  saveConfig(config);
  return config;
}

export function updateDefaultActionConfig(key: string, assignToPlayer?: boolean, hasDirection?: boolean, hasRating?: boolean): ActionsConfig {
  const config = getConfig();
  if (!config.defaultActionsConfig) config.defaultActionsConfig = {};
  if (!config.defaultActionsConfig[key]) config.defaultActionsConfig[key] = {};
  const overrides = config.defaultActionsConfig[key];
  if (hasDirection !== undefined) overrides.hasDirection = hasDirection;
  if (hasDirection) overrides.showOnCourt = true;
  if (assignToPlayer !== undefined) overrides.assignToPlayer = assignToPlayer;
  if (hasRating !== undefined) overrides.hasRating = hasRating;
  saveConfig(config);
  return config;
}

export function deleteCustomAction(id: string): ActionsConfig {
  const config = getConfig();
  config.customActions = config.customActions.filter(a => a.id !== id);
  saveConfig(config);
  return config;
}

// ── Advantage Rule per sport ──

const ADVANTAGE_STORAGE_KEY = 'myvolley-advantage-rule';

interface AdvantageRuleConfig {
  tennis: boolean;
  padel: boolean;
}

function getAdvantageConfig(): AdvantageRuleConfig {
  try {
    const raw = localStorage.getItem(ADVANTAGE_STORAGE_KEY);
    if (!raw) return { tennis: true, padel: false };
    return JSON.parse(raw);
  } catch {
    return { tennis: true, padel: false };
  }
}

export function getAdvantageRule(sport: SportType): boolean {
  if (sport !== 'tennis' && sport !== 'padel') return true;
  return getAdvantageConfig()[sport];
}

export function setAdvantageRule(sport: SportType, value: boolean): void {
  if (sport !== 'tennis' && sport !== 'padel') return;
  const config = getAdvantageConfig();
  config[sport] = value;
  localStorage.setItem(ADVANTAGE_STORAGE_KEY, JSON.stringify(config));
  // Sync to cloud
  syncAdvantageToCloud(config);
}

async function syncAdvantageToCloud(config: AdvantageRuleConfig) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;
    await patchCloudSettings(userId, { advantageRule: config });
  } catch { /* silent */ }
}

/** Hydrate advantage rule from cloud */
export function hydrateAdvantageRule(cloud: { tennis: boolean; padel: boolean }) {
  localStorage.setItem(ADVANTAGE_STORAGE_KEY, JSON.stringify(cloud));
}

/** Get the real ActionType key for a custom action (maps to "other_*") */
export function getCustomActionRealKey(customAction: CustomAction): ActionType {
  const otherKeys = OTHER_ACTION_KEYS[customAction.sport];
  if (customAction.category === 'neutral') return otherKeys.neutral;
  return customAction.category === 'scored' ? otherKeys.scored : otherKeys.fault;
}

/** Get visible actions for a sport + category, including custom ones */
export function getVisibleActions(
  sport: SportType,
  category: PointType,
  defaultActions: { key: string; label: string; points?: number; hasRating?: boolean }[]
): { key: string; label: string; points?: number; customId?: string; sigil?: string; showOnCourt?: boolean; hasDirection?: boolean; hasRating?: boolean; assignToPlayer?: boolean }[] {
  const config = getConfig();

  // Filter out hidden default actions, applying defaultActionsConfig overrides
  const visible = defaultActions
    .filter(a => !config.hiddenActions.includes(a.key))
    .map(a => {
      const overrides = config.defaultActionsConfig?.[a.key] || {};
      return {
        ...a,
        assignToPlayer: overrides.assignToPlayer ?? true,
        hasDirection: overrides.hasDirection ?? false,
        showOnCourt: overrides.showOnCourt ?? overrides.hasDirection ?? false,
        hasRating: overrides.hasRating ?? a.hasRating ?? false,
      };
    });

  // Add custom actions for this sport + category, excluding hidden ones
  const customs = config.customActions
    .filter(c => c.sport === sport && c.category === category && !config.hiddenActions.includes(c.id))
    .map(c => ({
      key: getCustomActionRealKey(c),
      label: c.label,
      customId: c.id,
      ...(c.points != null && { points: c.points }),
      ...(c.sigil ? { sigil: c.sigil } : {}),
      ...(c.showOnCourt != null ? { showOnCourt: c.showOnCourt } : {}),
      ...(c.assignToPlayer != null ? { assignToPlayer: c.assignToPlayer } : {}),
      ...(c.hasDirection ? { hasDirection: true } : {}),
      hasRating: c.hasRating ?? false,
    }));

  return [...visible, ...customs];
}
