// Scenario Index — all scenarios for RoadSense
import { villageRoadScenario } from './village-road';
import { urbanIntersectionScenario } from './urban-intersection';
import { highwayMergeScenario } from './highway-merge';
import { denseMarketScenario } from './dense-market';
import { cattleCrossingScenario } from './cattle-crossing';
import type { ScenarioConfig } from '@/types/simulation';

export const ALL_SCENARIOS: ScenarioConfig[] = [
  villageRoadScenario,
  urbanIntersectionScenario,
  highwayMergeScenario,
  denseMarketScenario,
  cattleCrossingScenario,
];

export const SIH_SCENARIOS = ALL_SCENARIOS.filter(s => s.tags.includes('SIH'));

export function getScenarioById(id: string): ScenarioConfig | undefined {
  return ALL_SCENARIOS.find(s => s.id === id);
}

export {
  villageRoadScenario,
  urbanIntersectionScenario,
  highwayMergeScenario,
  denseMarketScenario,
  cattleCrossingScenario,
};
