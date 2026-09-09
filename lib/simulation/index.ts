// lib/simulation/index.ts — re-exports for convenience
export { SimulationEngine } from './engine';
export { SimulationRenderer } from './renderer';
export { runPerception } from './perception';
export { updateTracks } from './tracking';
export { predictTrajectories, calculateTTC } from './prediction';
export { evaluateDecision } from './decision';
export { planPath } from './planner';
export { assessRisk } from './collision';
export { updateVehiclePhysics, updateAgentPhysics } from './physics';
