// Database Types for RoadSense
export type UserRole = 'user' | 'researcher' | 'administrator';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string | null;
  road_type: string;
  traffic_density: string;
  weather: string;
  visibility: string;
  difficulty: string;
  is_builtin: boolean;
  created_by: string | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Simulation {
  id: string;
  user_id: string;
  scenario_id: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  duration_seconds: number | null;
  safety_score: number | null;
  collision_count: number;
  near_miss_count: number;
  replanning_count: number;
  completion_rate: number | null;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // joined
  scenario?: Scenario;
  profile?: Profile;
}

export interface SimulationMetricsDB {
  id: string;
  simulation_id: string;
  replanning_latency_ms: number | null;
  path_smoothness: number | null;
  avg_speed_kmh: number | null;
  max_deceleration: number | null;
  min_clearance_m: number | null;
  planning_frequency_hz: number | null;
  prediction_accuracy: number | null;
  decision_response_time_ms: number | null;
  travel_time_s: number | null;
  created_at: string;
}

export interface SimulationEventDB {
  id: string;
  simulation_id: string;
  timestamp_s: number;
  event_type: string;
  description: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
}

export interface Dataset {
  id: string;
  name: string;
  source: string;
  description: string | null;
  dataset_type: string | null;
  license: string | null;
  usage_notes: string | null;
  sample_count: number | null;
  added_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  simulation_id: string;
  user_id: string;
  title: string;
  content: Record<string, unknown> | null;
  pdf_url: string | null;
  created_at: string;
  simulation?: Simulation;
}
