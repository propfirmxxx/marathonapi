import { MarathonRule, MarathonRules } from '../enums/marathon-rule.enum';

export interface MarathonRuleItem {
  type: MarathonRule;
  value: number;
}

/**
 * Transform MarathonRules object to array format for client
 * @param rules MarathonRules object
 * @returns Array of rule items in format [{type, value}]
 */
export function transformRulesToArray(rules: MarathonRules | null | undefined): MarathonRuleItem[] {
  if (!rules) {
    return [];
  }

  return Object.entries(rules)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([type, value]) => ({
      type: type as MarathonRule,
      value: value as number,
    }));
}

