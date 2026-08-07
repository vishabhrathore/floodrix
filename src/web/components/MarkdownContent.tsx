"use client";

import React from "react";

import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

interface ChartSeries {
  name: string;
  values: number[];
}

interface WorkflowChartRendererProps {
  title: string;
  chartType: string;
  xLabel: string;
  yLabel: string;
  xValues: number[];
  yDataSeries: ChartSeries[];
  width?: number;
  height?: number;
}

const WorkflowChartRenderer: React.FC<WorkflowChartRendererProps> = ({
  title,
  chartType,
  xLabel,
  yLabel,
  xValues = [],
  yDataSeries = [],
  width = 600,
  height = 280,
}) => {
  const paddingLeft = 60;
  const paddingRight = 30;
  const paddingTop = 45;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const xVals = Array.isArray(xValues) ? xValues.map(Number) : [];
  const minX = xVals.length > 0 ? Math.min(...xVals) : 0;
  const maxX = xVals.length > 0 ? Math.max(...xVals) : 1;
  const rangeX = maxX - minX || 1;

  let minY = 0;
  let maxY = 1;

  const allYValues = Array.isArray(yDataSeries)
    ? yDataSeries.flatMap((s) => (Array.isArray(s?.values) ? s.values.map(Number) : []))
    : [];

  if (allYValues.length > 0) {
    minY = Math.min(...allYValues);
    maxY = Math.max(...allYValues);
  }

  if (minY > 0) minY = 0;
  const rangeY = maxY - minY || 1;
  const actualRangeY = rangeY * 1.1;

  const projectX = (val: number) => paddingLeft + ((val - minX) / rangeX) * chartWidth;
  const projectY = (val: number) => height - paddingBottom - ((val - minY) / actualRangeY) * chartHeight;

  const colors = ["#fb3640", "#247ba0", "#0d9488", "#eab308", "#a855f7"];

  const xTicks = [];
  for (let i = 0; i <= 5; i++) {
    const fraction = i / 5;
    const val = minX + fraction * rangeX;
    xTicks.push({
      x: projectX(val),
      label: val.toFixed(0),
    });
  }

  const yTicks = [];
  for (let i = 0; i <= 5; i++) {
    const fraction = i / 5;
    const val = minY + fraction * actualRangeY;
    yTicks.push({
      y: projectY(val),
      label: val.toFixed(val < 10 ? 2 : 0),
    });
  }

  return (
    <div className="my-8 border border-neutral-200 rounded-lg p-4 bg-white shadow-xs">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <text
          x={width / 2}
          y={25}
          textAnchor="middle"
          className="font-sans font-bold text-sm fill-neutral-800"
        >
          {title}
        </text>

        {Array.isArray(yDataSeries) &&
          yDataSeries.map((series, idx) => {
            const xPos = width - paddingRight - 130 * (yDataSeries.length - idx);
            const color = colors[idx % colors.length];
            return (
              <g key={series?.name || idx} transform={`translate(${xPos}, 25)`}>
                <line
                  x1={0}
                  y1={-3}
                  x2={15}
                  y2={-3}
                  stroke={color}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                <text
                  x={20}
                  y={1}
                  className="font-sans font-medium text-[10px] fill-neutral-500"
                >
                  {series?.name || `Series ${idx + 1}`}
                </text>
              </g>
            );
          })}

        <g>
          {xTicks.map((t, idx) => (
            <g key={`x-${idx}`}>
              <line
                x1={t.x}
                y1={paddingTop}
                x2={t.x}
                y2={height - paddingBottom}
                stroke="#e5e7eb"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <text
                x={t.x}
                y={height - paddingBottom + 16}
                textAnchor="middle"
                className="font-sans text-[9px] fill-neutral-400"
              >
                {t.label}
              </text>
            </g>
          ))}
          {yTicks.map((t, idx) => (
            <g key={`y-${idx}`}>
              <line
                x1={paddingLeft}
                y1={t.y}
                x2={width - paddingRight}
                y2={t.y}
                stroke="#e5e7eb"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <text
                x={paddingLeft - 8}
                y={t.y + 3}
                textAnchor="end"
                className="font-sans text-[9px] fill-neutral-400"
              >
                {t.label}
              </text>
            </g>
          ))}
        </g>

        <g>
          {Array.isArray(yDataSeries) &&
            yDataSeries.map((series, sIdx) => {
              const color = colors[sIdx % colors.length];
              const vals = Array.isArray(series?.values) ? series.values.map(Number) : [];
              const points = vals.map((yVal, xIdx) => {
                const xVal = xVals[xIdx] ?? xIdx;
                return { x: projectX(xVal), y: projectY(yVal) };
              });

              if (points.length === 0) return null;

              if (chartType === "line" || chartType === "area") {
                const pointsStr = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

                return (
                  <g key={`series-${sIdx}`}>
                    {chartType === "area" && (
                      <polygon
                        points={`${points[0].x.toFixed(1)},${projectY(0).toFixed(1)} ${pointsStr} ${points[points.length - 1].x.toFixed(1)},${projectY(0).toFixed(1)}`}
                        fill={color}
                        fillOpacity={0.15}
                      />
                    )}
                    <polyline
                      points={pointsStr}
                      fill="none"
                      stroke={color}
                      strokeWidth={2.5}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    {points.length < 100 &&
                      points.map((p, pIdx) => (
                        <circle
                          key={`p-${pIdx}`}
                          cx={p.x}
                          cy={p.y}
                          r={3}
                          fill="#ffffff"
                          stroke={color}
                          strokeWidth={1.5}
                        />
                      ))}
                  </g>
                );
              } else if (chartType === "scatter") {
                return (
                  <g key={`series-${sIdx}`}>
                    {points.map((p, pIdx) => (
                      <circle
                        key={`p-${pIdx}`}
                        cx={p.x}
                        cy={p.y}
                        r={4.5}
                        fill={color}
                        fillOpacity={0.85}
                        stroke="#ffffff"
                        strokeWidth={1}
                      />
                    ))}
                  </g>
                );
              } else if (chartType === "bar") {
                const barCount = points.length;
                const totalWidth = chartWidth / barCount;
                const barSpacing = totalWidth * 0.2;
                const barWidth = Math.max(1, totalWidth - barSpacing);

                return (
                  <g key={`series-${sIdx}`}>
                    {points.map((p, pIdx) => {
                      const zeroY = projectY(0);
                      const barHeight = zeroY - p.y;
                      const barX = p.x - barWidth / 2;

                      return (
                        <rect
                          key={`bar-${pIdx}`}
                          x={barX}
                          y={barHeight >= 0 ? p.y : zeroY}
                          width={barWidth}
                          height={Math.abs(barHeight)}
                          fill={color}
                          rx={1}
                        />
                      );
                    })}
                  </g>
                );
              }
              return null;
            })}
        </g>

        <line
          x1={paddingLeft}
          y1={paddingTop}
          x2={paddingLeft}
          y2={height - paddingBottom}
          stroke="#9ca3af"
          strokeWidth={1.5}
        />
        <line
          x1={paddingLeft}
          y1={height - paddingBottom}
          x2={width - paddingRight}
          y2={height - paddingBottom}
          stroke="#9ca3af"
          strokeWidth={1.5}
        />

        <text
          x={width / 2}
          y={height - 8}
          textAnchor="middle"
          className="font-sans font-semibold text-[10px] fill-neutral-500"
        >
          {xLabel}
        </text>
        <text
          x={15}
          y={height / 2}
          textAnchor="middle"
          transform={`rotate(-90 15 ${height / 2})`}
          className="font-sans font-semibold text-[10px] fill-neutral-500"
        >
          {yLabel}
        </text>
      </svg>
    </div>
  );
};

interface MarkdownContentProps {
  content: string;
  className?: string;
}

const MarkdownContent: React.FC<MarkdownContentProps> = ({
  content,
  className = "",
}) => {
  return (
    <div className={`prose-custom ${className}`}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          h2: ({ node, children, ...props }) => {
            const text = String(children);
            const hid = text
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, "");
            return (
              <h2
                id={hid}
                className="font-serif font-bold text-brand-dark mt-20 mb-8 scroll-mt-32"
                style={{
                  fontSize: "clamp(1.35rem, 2vw, 1.75rem)",
                  lineHeight: 1.25,
                }}
                {...props}
              >
                {children}
              </h2>
            );
          },
          h3: ({ node, children, ...props }) => {
            const text = String(children);
            const hid = text
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, "");
            return (
              <h3
                id={hid}
                className="font-sans font-bold text-brand-dark mt-14 mb-5 pl-4 border-l-2 border-brand-red scroll-mt-32"
                style={{
                  fontSize: "clamp(1.1rem, 1.6vw, 1.35rem)",
                  lineHeight: 1.3,
                }}
                {...props}
              >
                {children}
              </h3>
            );
          },
          h4: ({ node, ...props }) => (
            <h4
              className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-brand-red mb-4 mt-10"
              {...props}
            />
          ),
          p: ({ node, ...props }) => (
            <p
              className="font-sans text-gray-700 leading-[1.82] mb-10"
              style={{ fontSize: "1.0625rem" }}
              {...props}
            />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="my-14 border-l-2 border-brand-red pl-8 font-serif italic text-gray-500 bg-gray-50/50 py-4 pr-6"
              style={{ fontSize: "1.125rem", lineHeight: 1.7 }}
              {...props}
            />
          ),
          ul: ({ node, ...props }) => (
            <ul className="space-y-3 mb-10 list-none" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol
              className="list-decimal list-outside ml-5 mb-10 space-y-3 font-sans"
              {...props}
            />
          ),
          li: ({ node, children, ...props }) => {
            // Check if parent is ol
            const isOrdered = (node as any)?.parent?.tagName === "ol";
            if (isOrdered) {
              return (
                <li
                  className="text-gray-700 leading-relaxed pl-1"
                  style={{ fontSize: "1.0625rem" }}
                  {...props}
                >
                  {children}
                </li>
              );
            }
            return (
              <li
                className="flex gap-4 items-start text-gray-700"
                style={{ fontSize: "1.0625rem", lineHeight: 1.75 }}
              >
                <div className="w-1 h-1 rounded-full bg-brand-red mt-3 flex-shrink-0" />
                <span>{children}</span>
              </li>
            );
          },
          strong: ({ node, ...props }) => (
            <strong className="font-bold text-brand-dark" {...props} />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-14 border border-gray-100 shadow-sm bg-white">
              <table
                className="w-full text-left border-collapse font-sans"
                {...props}
              />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-gray-50 border-b border-gray-100" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th
              className="px-6 py-4 text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400"
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td
              className="px-6 py-5 text-sm text-gray-600 border-b border-gray-50 leading-relaxed align-top"
              {...props}
            />
          ),
          tr: ({ node, ...props }) => (
            <tr className="hover:bg-gray-50/50 transition-colors" {...props} />
          ),
          code: ({ node, className, children, ...props }) => {
            const match = /language-([\w-]+)/.exec(className || "");
            const lang = match ? match[1] : "";
            if (lang === "chart" || lang === "chart-data") {
              try {
                const data = JSON.parse(String(children));
                return <WorkflowChartRenderer {...data} />;
              } catch (e) {
                return (
                  <pre className="text-red-500 text-xs p-4 bg-red-50 rounded-md my-4">
                    Error rendering chart: {String(e)}
                  </pre>
                );
              }
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </Markdown>
    </div>
  );
};

export default MarkdownContent;
