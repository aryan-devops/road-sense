# RoadSense 🛣️🚙

**Adaptive Autonomous Navigation for Indian Roads**

RoadSense is a highly sophisticated, real-time cyber-physical simulation platform designed specifically for the unique and challenging traffic conditions found in India. From dense, chaotic urban markets to village roads with stray cattle, RoadSense provides the ultimate testing ground for next-generation autonomous vehicle perception and decision-making systems.

![RoadSense Simulation](https://img.shields.io/badge/Simulation-Three.js-black?style=flat-square&logo=three.js)
![Next.js App](https://img.shields.io/badge/Web_App-Next.js_15-black?style=flat-square&logo=next.js)
![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=flat-square&logo=supabase)

---

## 🌟 Key Features

- **Hyper-Realistic 3D Digital Twin**: Powered by `Three.js` with dynamic environment generation, realistic vehicle physics, and responsive WebGL rendering.
- **Complex Indian Scenarios**: Built-in edge-case scenarios including:
  - 🚦 **Dense Urban Markets** (high pedestrian density, unpredictable two-wheelers)
  - 🐄 **Village Roads** (unmarked lanes, stray cattle, slow-moving carts)
  - 🛣️ **Highway Merges** (high-speed chaotic lane changing)
- **Advanced Cyber-Physical Engine**:
  - `perception.ts`: LiDAR bounding boxes, semantic segmentation, and object tracking.
  - `planner.ts` & `decision.ts`: A* pathfinding, real-time trajectory re-planning, and collision avoidance algorithms.
  - `tracking.ts`: Kalman filter-inspired velocity tracking and trajectory prediction.
- **Interactive Cyberpunk / Glassmorphic UI**: High-end Next.js dashboard built with `shadcn/ui` and Tailwind CSS, featuring rich visual telemetry, real-time metrics, and live sensor logs.
- **Supabase Integration**: Secure authentication, cloud-stored simulation scenarios, and analytical history tracking.

## 🚀 Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm, yarn, or pnpm
- Supabase account (for database features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/aryan-devops/road-sense.git
   cd roadsense
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Environment Variables**
   Create a `.env.local` file in the root directory and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the Development Server**
   ```bash
   npm run dev
   ```

5. **Open the Application**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## 🧠 Simulation Architecture

The simulation engine runs at 60Hz and is decoupled from the Three.js rendering loop, ensuring deterministic physics updates regardless of frame rate.

- **`SimulationEngine`**: The core orchestrator that ticks the physics, perception, and planning layers.
- **`ThreeDigitalTwin`**: The visualizer that syncs the logical state of the engine into a WebGL context, mapping logical agents to loaded GLTF models or procedural meshes.
- **State Management**: Uses React state linked to `Engine` events to display rich 2D overlays (speedometers, sensory radar, object lists) over the 3D canvas.

## 🛠️ Tech Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, lucide-react, shadcn/ui
- **3D Rendering**: Three.js, WebGL
- **State & Backend**: React Hooks, Supabase (Auth & Postgres)

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! 
Feel free to check the [issues page](https://github.com/aryan-devops/road-sense/issues).

## 📝 License

This project is open-source and available under the [MIT License](LICENSE).
