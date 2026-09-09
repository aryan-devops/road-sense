import { create } from 'zustand';
import type { SimulationState, SimulationConfig, ScenarioConfig, SimulationStatus, InjectedEventType } from '@/types/simulation';
import { villageRoadScenario } from '@/lib/scenarios';

const DEFAULT_CONFIG: SimulationConfig = {
  vehicleSpeed: 8,
  trafficDensity: 0.6,
  pedestrianDensity: 0.4,
  reactionTime: 0.15,
  sensorRange: 60,
  predictionHorizon: 3,
  safetyDistance: 5,
  maxAcceleration: 3,
  maxBraking: 6,
  planningHorizon: 4,
  replanningThreshold: 0.7,
  randomizationMode: false,
};

interface SimulationStore {
  // Engine instance (not reactive — stored as ref)
  engineRef: { current: unknown };

  // Reactive simulation state (synced from engine at 10Hz)
  simState: SimulationState | null;
  selectedScenario: ScenarioConfig;
  config: SimulationConfig;
  status: SimulationStatus;
  simSpeed: number;

  // Actions
  setSimState: (state: SimulationState) => void;
  setSelectedScenario: (scenario: ScenarioConfig) => void;
  updateConfig: (config: Partial<SimulationConfig>) => void;
  setStatus: (status: SimulationStatus) => void;
  setSimSpeed: (speed: number) => void;
}

export const useSimulationStore = create<SimulationStore>((set) => ({
  engineRef: { current: null },
  simState: null,
  selectedScenario: villageRoadScenario,
  config: DEFAULT_CONFIG,
  status: 'idle',
  simSpeed: 1,

  setSimState: (state) => set({ simState: state, status: state.status }),
  setSelectedScenario: (scenario) => set({ selectedScenario: scenario }),
  updateConfig: (config) => set(s => ({ config: { ...s.config, ...config } })),
  setStatus: (status) => set({ status }),
  setSimSpeed: (speed) => set({ simSpeed: speed }),
}));

export { DEFAULT_CONFIG };
