// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/interpolation.ts
//  1D and 2D interpolation for digitized curves from IRC codebooks
// ═══════════════════════════════════════════════════════════════════════════

interface Point {
  x: number;
  y: number;
}

/**
 * 1D interpolation on a set of (x, y) points.
 *
 * @param points  - Sorted array of {x, y} data points (must be sorted by x)
 * @param xValue  - The x value to interpolate at
 * @param method  - "linear" | "cubic_spline" | "step"
 * @param extrapolation - "clamp" | "extend" | "error"
 */
export function interpolate(
  points: Point[],
  xValue: number,
  method: string = "linear",
  extrapolation: string = "clamp",
): number {
  if (points.length === 0) throw new Error("No data points for interpolation");
  if (points.length === 1) return points[0].y;

  // Ensure sorted by x
  const sorted = [...points].sort((a, b) => a.x - b.x);

  const xMin = sorted[0].x;
  const xMax = sorted[sorted.length - 1].x;

  // Handle extrapolation (x outside data range)
  if (xValue < xMin || xValue > xMax) {
    if (extrapolation === "error") {
      throw new Error(
        `Interpolation value ${xValue} is outside data range [${xMin}, ${xMax}]`,
      );
    }
    if (extrapolation === "clamp") {
      if (xValue <= xMin) return sorted[0].y;
      return sorted[sorted.length - 1].y;
    }
    // "extend" — extrapolate using the nearest segment
    if (xValue < xMin) {
      return linearInterp(sorted[0], sorted[1], xValue);
    }
    return linearInterp(
      sorted[sorted.length - 2],
      sorted[sorted.length - 1],
      xValue,
    );
  }

  // Find the bracketing interval
  let lo = 0;
  let hi = sorted.length - 1;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (sorted[mid].x <= xValue) lo = mid;
    else hi = mid;
  }

  // Exact match check
  if (sorted[lo].x === xValue) return sorted[lo].y;
  if (sorted[hi].x === xValue) return sorted[hi].y;

  switch (method) {
    case "step":
      return sorted[lo].y; // Step function — use left value

    case "cubic_spline":
      return cubicSplineInterp(sorted, xValue, lo);

    case "linear":
    default:
      return linearInterp(sorted[lo], sorted[hi], xValue);
  }
}

/**
 * Simple linear interpolation between two points.
 */
function linearInterp(p1: Point, p2: Point, x: number): number {
  if (p2.x === p1.x) return p1.y;
  const t = (x - p1.x) / (p2.x - p1.x);
  return p1.y + t * (p2.y - p1.y);
}

/**
 * Natural cubic spline interpolation.
 * Builds a full cubic spline across all points, then evaluates at x.
 */
function cubicSplineInterp(
  points: Point[],
  x: number,
  segmentIdx: number,
): number {
  const n = points.length;
  if (n < 3) return linearInterp(points[segmentIdx], points[segmentIdx + 1], x);

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);

  // Step 1: Compute h[i] = x[i+1] - x[i]
  const h: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    h.push(xs[i + 1] - xs[i]);
  }

  // Step 2: Build the tridiagonal system for natural spline (c[0] = c[n-1] = 0)
  const alpha: number[] = [0];
  for (let i = 1; i < n - 1; i++) {
    alpha.push(
      (3 / h[i]) * (ys[i + 1] - ys[i]) - (3 / h[i - 1]) * (ys[i] - ys[i - 1]),
    );
  }

  // Step 3: Solve tridiagonal system
  const l: number[] = [1];
  const mu: number[] = [0];
  const z: number[] = [0];

  for (let i = 1; i < n - 1; i++) {
    l.push(2 * (xs[i + 1] - xs[i - 1]) - h[i - 1] * mu[i - 1]);
    mu.push(h[i] / l[i]);
    z.push((alpha[i] - h[i - 1] * z[i - 1]) / l[i]);
  }

  l.push(1);
  z.push(0);

  const c: number[] = new Array(n).fill(0);
  const b: number[] = new Array(n - 1).fill(0);
  const d: number[] = new Array(n - 1).fill(0);

  for (let j = n - 2; j >= 0; j--) {
    c[j] = z[j] - mu[j] * c[j + 1];
    b[j] = (ys[j + 1] - ys[j]) / h[j] - (h[j] * (c[j + 1] + 2 * c[j])) / 3;
    d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
  }

  // Step 4: Evaluate at x using the segment
  const i = segmentIdx;
  const dx = x - xs[i];
  return ys[i] + b[i] * dx + c[i] * dx * dx + d[i] * dx * dx * dx;
}

/**
 * 2D interpolation for IDF curves and similar 2-parameter tables.
 * Uses bilinear interpolation on a grid.
 *
 * @param xValues - First dimension values (e.g., duration)
 * @param yValues - Second dimension values (e.g., return period)
 * @param zValues - 2D matrix [yIndex][xIndex]
 * @param xTarget - Target x value
 * @param yTarget - Target y value
 */
export function interpolate2D(
  xValues: number[],
  yValues: number[],
  zValues: number[][],
  xTarget: number,
  yTarget: number,
  extrapolation: string = "clamp",
): number {
  // Clamp or error for out-of-range
  let xClamped = xTarget;
  let yClamped = yTarget;

  if (extrapolation === "clamp") {
    xClamped = Math.max(
      xValues[0],
      Math.min(xTarget, xValues[xValues.length - 1]),
    );
    yClamped = Math.max(
      yValues[0],
      Math.min(yTarget, yValues[yValues.length - 1]),
    );
  } else if (extrapolation === "error") {
    if (
      xTarget < xValues[0] ||
      xTarget > xValues[xValues.length - 1] ||
      yTarget < yValues[0] ||
      yTarget > yValues[yValues.length - 1]
    ) {
      throw new Error(
        `2D interpolation target (${xTarget}, ${yTarget}) is outside data range`,
      );
    }
  }

  // Find bracketing indices for x
  let xi = 0;
  for (let i = 0; i < xValues.length - 1; i++) {
    if (xClamped >= xValues[i] && xClamped <= xValues[i + 1]) {
      xi = i;
      break;
    }
  }

  // Find bracketing indices for y
  let yi = 0;
  for (let i = 0; i < yValues.length - 1; i++) {
    if (yClamped >= yValues[i] && yClamped <= yValues[i + 1]) {
      yi = i;
      break;
    }
  }

  // Bilinear interpolation
  const x1 = xValues[xi],
    x2 = xValues[xi + 1];
  const y1 = yValues[yi],
    y2 = yValues[yi + 1];

  const Q11 = zValues[yi][xi];
  const Q21 = zValues[yi][xi + 1];
  const Q12 = zValues[yi + 1][xi];
  const Q22 = zValues[yi + 1][xi + 1];

  const tx = x2 === x1 ? 0 : (xClamped - x1) / (x2 - x1);
  const ty = y2 === y1 ? 0 : (yClamped - y1) / (y2 - y1);

  const R1 = Q11 * (1 - tx) + Q21 * tx;
  const R2 = Q12 * (1 - tx) + Q22 * tx;

  return R1 * (1 - ty) + R2 * ty;
}
