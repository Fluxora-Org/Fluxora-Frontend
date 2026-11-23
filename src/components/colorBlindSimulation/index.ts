/**
 * Colour-blind simulation module
 * ────────────────────────────────
 * Developer / design-QA affordance for Treasury overview.
 *
 * Persistence: in-memory only (never localStorage/sessionStorage). Reload
 * always returns to `"none"`. See COLORBLIND_PERSISTENCE_POLICY.
 *
 * @module colorBlindSimulation
 */
export {
  ColorBlindSimulationProvider,
  ColorBlindSvgFilters,
  ColorBlindActiveBanner,
  useColorBlindSimulation,
  SIMULATION_LABELS,
  SVG_FILTER_VALUES,
  COLORBLIND_STORAGE_KEYS,
  COLORBLIND_PERSISTENCE_POLICY,
  clearColorBlindStorageArtifacts,
  isSimulationMode,
  type SimulationMode,
  type ColorBlindSimulationContextValue,
} from "./ColorBlindSimulationProvider";
export { default as ColorBlindToggle } from "./ColorBlindToggle";
