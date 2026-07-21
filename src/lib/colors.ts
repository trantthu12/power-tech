// Categorical chart palette — distinct hues so adjacent series are easy to tell
// apart (the old all-green ramp read as "same color"). Validated CVD-safe on a
// white surface via the dataviz skill's validate_palette.js (labels/legend act
// as the required secondary encoding). Assign in fixed order, never cycled.
export const CATEGORICAL = [
  "#008300", // green  (brand)
  "#2a78d6", // blue
  "#eda100", // amber
  "#e87ba4", // magenta
  "#1baf7a", // aqua
  "#eb6834", // orange
] as const;

/** Fixed color per connector type so it's consistent across the app. */
export const CONNECTOR_COLORS: Record<string, string> = {
  CCS: "#008300",
  J1772: "#2a78d6",
  CHAdeMO: "#eda100",
};
