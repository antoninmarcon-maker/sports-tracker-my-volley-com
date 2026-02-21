import { SportType, ActionType, PointType, OTHER_ACTION_KEYS } from '@/types/sports';

const STORAGE_KEY = 'myvolley-actions-config';

export interface CustomAction {
  id: string;
  label: string;
  sport: SportType;
  category: PointType; // 'scored' or 'fault'
  points?: number; // For basketball scored actions: 1, 2 or 3
}

export interface ActionsConfig {
  /** Action keys that are hidden (not shown in match UI) */
  hiddenActions: string[];
  /** User-created custom actions */
  customActions: CustomAction[];
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
      'other_offensive', 'other_volley_fault',
      'other_tennis_winner', 'other_tennis_fault',
      'other_padel_winner', 'other_padel_fault',
      'other_basket_fault',
    ],
    customActions: [],
  };
}

function saveConfig(config: ActionsConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function getActionsConfig(): ActionsConfig {
  return getConfig();
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

export function addCustomAction(label: string, sport: SportType, category: PointType, points?: number): ActionsConfig {
  const config = getConfig();
  config.customActions.push({
    id: crypto.randomUUID(),
    label: label.trim(),
    sport,
    category,
    ...(points != null && { points }),
  });
  saveConfig(config);
  return config;
}

export function updateCustomAction(id: string, newLabel: string, points?: number): ActionsConfig {
  const config = getConfig();
  const action = config.customActions.find(a => a.id === id);
  if (action) {
    action.label = newLabel.trim();
    if (action.sport === 'basketball' && action.category === 'scored') {
      action.points = points;
    }
  }
  saveConfig(config);
  return config;
}

export function deleteCustomAction(id: string): ActionsConfig {
  const config = getConfig();
  config.customActions = config.customActions.filter(a => a.id !== id);
  saveConfig(config);
  return config;
}

/** Get the real ActionType key for a custom action (maps to "other_*") */
export function getCustomActionRealKey(customAction: CustomAction): ActionType {
  const otherKeys = OTHER_ACTION_KEYS[customAction.sport];
  return customAction.category === 'scored' ? otherKeys.scored : otherKeys.fault;
}

/** Get visible actions for a sport + category, including custom ones */
export function getVisibleActions(
  sport: SportType,
  category: PointType,
  defaultActions: { key: string; label: string; points?: number }[]
): { key: string; label: string; points?: number; customId?: string }[] {
  const config = getConfig();

  // Filter out hidden default actions
  const visible = defaultActions.filter(a => !config.hiddenActions.includes(a.key));

  // Add custom actions for this sport + category
  const customs = config.customActions
    .filter(c => c.sport === sport && c.category === category)
    .map(c => ({
      key: getCustomActionRealKey(c),
      label: c.label,
      customId: c.id,
      ...(c.points != null && { points: c.points }),
    }));

  return [...visible, ...customs];
}
