// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/handlers/ChartHandler.ts
//
//  CHART — Dynamically renders SVG charts from workflow variables.
//   Decouples visualization from custom code, allowing no-code config.
// ═══════════════════════════════════════════════════════════════════════════

import type { NodeHandler } from "../NodeHandler";
import { toErroredOutcome } from "../NodeHandler";
import type { ExecutionContext, NodeOutcome, VariableMap } from "../types";
import { logger } from "../logger";

interface ChartConfig {
  chart_type?: "line" | "area" | "bar" | "scatter";
  title?: string;
  x_variable?: string;
  y_variables?: string[];
  x_label?: string;
  y_label?: string;
  y_labels?: string[]; // Custom names for each Y series
  colors?: string[]; // Hex codes for each Y series
  width?: number;
  height?: number;
  output_variable?: string; // Optional: where to store the SVG string
}

export class ChartHandler implements NodeHandler {
  readonly type = "CHART" as const;
  readonly timeoutMs = 10_000;

  async execute(ctx: ExecutionContext): Promise<NodeOutcome> {
    try {
      const config = (ctx.node.config ?? {}) as ChartConfig;
      const title = config.title ?? ctx.node.label ?? "Chart Output";
      const chartType = config.chart_type ?? "line";
      const yVarNames = config.y_variables ?? [];
      const xVarName = config.x_variable;
      const xLabel = config.x_label ?? "X Axis";
      const yLabel = config.y_label ?? "Y Axis";
      const customColors = config.colors ?? ["#fb3640", "#247ba0", "#0d9488", "#eab308", "#a855f7"];
      const width = config.width ?? 600;
      const height = config.height ?? 300;

      if (yVarNames.length === 0) {
        return toErroredOutcome(new Error("CHART node has no y_variables configured"));
      }

      // 1. Resolve Y-axis data arrays
      const yDataSeries: { name: string; values: number[] }[] = [];
      let maxLen = 0;

      for (let i = 0; i < yVarNames.length; i++) {
        const varName = yVarNames[i];
        const val = ctx.variables.get(varName);

        let arr: number[] = [];
        if (Array.isArray(val)) {
          arr = val.map((v) => Number(v)).filter((v) => !isNaN(v));
        } else if (typeof val === "number") {
          arr = [val];
        } else if (typeof val === "string") {
          const num = Number(val);
          if (!isNaN(num)) arr = [num];
        }

        const seriesLabel = config.y_labels?.[i] ?? varName;
        yDataSeries.push({ name: seriesLabel, values: arr });
        if (arr.length > maxLen) {
          maxLen = arr.length;
        }
      }

      if (maxLen === 0) {
        return toErroredOutcome(new Error("No valid numeric data found in the configured y_variables."));
      }

      // 2. Resolve X-axis data array
      let xValues: number[] = [];
      if (xVarName) {
        const val = ctx.variables.get(xVarName);
        if (Array.isArray(val)) {
          xValues = val.map((v) => Number(v)).filter((v) => !isNaN(v));
        }
      }

      // Fallback: If X values are missing or don't match data length, generate sequence [0..maxLen-1]
      if (xValues.length === 0) {
        for (let i = 0; i < maxLen; i++) {
          xValues.push(i);
        }
      } else if (xValues.length < maxLen) {
        // Pad xValues if shorter than maxLen
        const lastVal = xValues[xValues.length - 1];
        for (let i = xValues.length; i < maxLen; i++) {
          xValues.push(lastVal + (i - xValues.length + 1));
        }
      }

      // 3. Compute Min/Max Boundaries
      const minX = Math.min(...xValues);
      const maxX = Math.max(...xValues);
      const rangeX = maxX - minX || 1;

      let minY = Infinity;
      let maxY = -Infinity;
      for (const series of yDataSeries) {
        for (const val of series.values) {
          if (val < minY) minY = val;
          if (val > maxY) maxY = val;
        }
      }

      // Set baseline and margin/padding
      if (minY === Infinity) minY = 0;
      if (maxY === -Infinity) maxY = 1;

      // Always show 0 baseline if data is positive, otherwise fit bounds
      if (minY > 0) minY = 0;
      const rangeY = (maxY - minY) || 1;

      // Pad Y-axis slightly so lines don't hit the very top
      const paddedMaxY = maxY + rangeY * 0.1;
      const actualRangeY = paddedMaxY - minY;

      // 4. Dimensions and Margins
      const paddingLeft = 60;
      const paddingRight = 30;
      const paddingTop = 45;
      const paddingBottom = 45;

      const chartWidth = width - paddingLeft - paddingRight;
      const chartHeight = height - paddingTop - paddingBottom;

      // Helper to project values to SVG coordinates
      const projectX = (val: number) => paddingLeft + ((val - minX) / rangeX) * chartWidth;
      const projectY = (val: number) => height - paddingBottom - ((val - minY) / actualRangeY) * chartHeight;

      // 5. Generate Gridlines & Labels
      let gridLinesSvg = "";
      // X-Axis grid and ticks (5 subdivisions)
      for (let i = 0; i <= 5; i++) {
        const fraction = i / 5;
        const val = minX + fraction * rangeX;
        const x = projectX(val);
        gridLinesSvg += `<line x1="${x.toFixed(1)}" y1="${paddingTop}" x2="${x.toFixed(1)}" y2="${(height - paddingBottom)}" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="3 3" />`;
        gridLinesSvg += `<text x="${x.toFixed(1)}" y="${(height - paddingBottom + 16)}" font-size="9" font-family="sans-serif" text-anchor="middle" fill="#6b7280">${val.toFixed(0)}</text>`;
      }

      // Y-Axis grid and ticks (5 subdivisions)
      for (let i = 0; i <= 5; i++) {
        const fraction = i / 5;
        const val = minY + fraction * actualRangeY;
        const y = projectY(val);
        gridLinesSvg += `<line x1="${paddingLeft}" y1="${y.toFixed(1)}" x2="${(width - paddingRight)}" y2="${y.toFixed(1)}" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="3 3" />`;
        gridLinesSvg += `<text x="${(paddingLeft - 8)}" y="${(y + 3).toFixed(1)}" font-size="9" font-family="sans-serif" text-anchor="end" fill="#6b7280">${val.toFixed(val < 10 ? 2 : 0)}</text>`;
      }

      // 6. Draw Data Series
      let dataSeriesSvg = "";
      let legendSvg = "";
      const legendItemWidth = 100;
      const startLegendX = width - paddingRight - (yDataSeries.length * legendItemWidth);

      for (let sIdx = 0; sIdx < yDataSeries.length; sIdx++) {
        const series = yDataSeries[sIdx];
        const color = customColors[sIdx % customColors.length];

        // Map points to SVG coordinates
        const points = series.values.map((yVal, xIdx) => {
          const xVal = xValues[xIdx] ?? xIdx;
          return { x: projectX(xVal), y: projectY(yVal) };
        });

        if (points.length === 0) continue;

        if (chartType === "line" || chartType === "area") {
          const pointsStr = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

          if (chartType === "area") {
            const firstX = points[0].x;
            const lastX = points[points.length - 1].x;
            const zeroY = projectY(0);
            const areaPointsStr = `${firstX.toFixed(1)},${zeroY.toFixed(1)} ${pointsStr} ${lastX.toFixed(1)},${zeroY.toFixed(1)}`;

            dataSeriesSvg += `<polygon points="${areaPointsStr}" fill="${color}" fill-opacity="0.15" />`;
          }

          dataSeriesSvg += `<polyline points="${pointsStr}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />`;

          // If under 100 points, render individual circle markers
          if (points.length < 100) {
            for (const p of points) {
              dataSeriesSvg += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="#ffffff" stroke="${color}" stroke-width="1.5" />`;
            }
          }
        } else if (chartType === "scatter") {
          for (const p of points) {
            dataSeriesSvg += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="${color}" fill-opacity="0.85" stroke="#ffffff" stroke-width="1" />`;
          }
        } else if (chartType === "bar") {
          const barCount = points.length;
          const totalWidth = chartWidth / barCount;
          const barSpacing = totalWidth * 0.2;
          const barWidth = Math.max(1, totalWidth - barSpacing);

          for (let pIdx = 0; pIdx < points.length; pIdx++) {
            const p = points[pIdx];
            const zeroY = projectY(0);
            const barHeight = zeroY - p.y;
            const barX = p.x - barWidth / 2;

            if (barHeight >= 0) {
              dataSeriesSvg += `<rect x="${barX.toFixed(1)}" y="${p.y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" fill="${color}" rx="1" />`;
            } else {
              // Negative bars
              dataSeriesSvg += `<rect x="${barX.toFixed(1)}" y="${zeroY.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${Math.abs(barHeight).toFixed(1)}" fill="${color}" rx="1" />`;
            }
          }
        }

        // Add legend entry
        const legendX = startLegendX + sIdx * legendItemWidth;
        const legendY = paddingTop - 22;
        legendSvg += `
          <g transform="translate(${legendX}, ${legendY})">
            <line x1="0" y1="0" x2="15" y2="0" stroke="${color}" stroke-width="3" stroke-linecap="round" />
            <text x="20" y="4" font-size="10" font-family="sans-serif" fill="#4b5563" font-weight="medium">${series.name}</text>
          </g>
        `;
      }

      // 7. Compile Final SVG
      const finalSvg = `
<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; font-family: sans-serif;" xmlns="http://www.w3.org/2000/svg">
  <!-- Title -->
  <text x="${(width / 2).toFixed(0)}" y="${(paddingTop - 20).toFixed(0)}" font-size="13" font-weight="700" text-anchor="middle" fill="#1f2937">${title}</text>
  
  <!-- Legend -->
  ${legendSvg}

  <!-- Gridlines -->
  ${gridLinesSvg}

  <!-- Data Series -->
  ${dataSeriesSvg}

  <!-- X & Y Axes -->
  <line x1="${paddingLeft}" y1="${paddingTop}" x2="${paddingLeft}" y2="${height - paddingBottom}" stroke="#9ca3af" stroke-width="1.5" />
  <line x1="${paddingLeft}" y1="${height - paddingBottom}" x2="${width - paddingRight}" y2="${height - paddingBottom}" stroke="#9ca3af" stroke-width="1.5" />

  <!-- Labels -->
  <text x="${(width / 2).toFixed(0)}" y="${height - 8}" font-size="10" font-weight="600" text-anchor="middle" fill="#4b5563">${xLabel}</text>
  <text x="15" y="${(height / 2).toFixed(0)}" font-size="10" font-weight="600" text-anchor="middle" transform="rotate(-90 15 ${(height / 2).toFixed(0)})" fill="#4b5563">${yLabel}</text>
</svg>
`.trim();

      const minifiedSvg = minifySvg(finalSvg);

      const outputs: VariableMap = {};
      const outputVar = config.output_variable ?? `${ctx.node.id}_svg_chart`;
      ctx.variables.set(outputVar, minifiedSvg);
      outputs[outputVar] = minifiedSvg;
      outputs.svgChart = minifiedSvg;
      outputs.title = title;
      outputs.chartType = chartType;
      outputs.xLabel = xLabel;
      outputs.yLabel = yLabel;
      outputs.xValues = xValues;
      outputs.yDataSeries = yDataSeries;

      // Save to variables store
      ctx.variables.trackNodeOutput(ctx.node.id, ctx.node.label, outputs);

      logger.info(
        { sessionId: ctx.sessionId, nodeId: ctx.node.id, outputVar },
        `[ChartHandler] Dynamic chart rendered successfully`
      );

      // Generate simple, beautiful markdown preview
      const markdown = `### 📈 ${title}\n${minifiedSvg}`;

      return {
        kind: "completed",
        outputs,
        result: {
          title,
          chartType,
          outputVar,
          svgChart: minifiedSvg,
          xValues,
          yDataSeries,
          xLabel,
          yLabel,
          markdown,
        },
      };
    } catch (err) {
      return toErroredOutcome(err);
    }
  }
}

function minifySvg(svg: string): string {
  return svg
    .replace(/<!--[\s\S]*?-->/g, "") // Remove comments
    .replace(/\s*[\r\n]+\s*/g, "") // Remove newlines and surrounding whitespaces
    .replace(/>\s+</g, "><") // Remove spaces between tags
    .trim();
}
