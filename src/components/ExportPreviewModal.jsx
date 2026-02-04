import React, { useMemo, useRef, useState } from "react";
import { getRoomsBounds, getDisplaySize } from "../utils/layout.js";

const A4 = { w: 297, h: 210 };
const PAGE_MARGIN = 10;
const LEGEND_GAP = 14;
const MIN_LEGEND_FONT = 5;

const LABEL_FONT = 5;
const ROOM_SIZE_FONT = 6.5;
const LABEL_LINE_HEIGHT = 1.25;
const LABEL_PADDING = 1.5;
const EDGE_GAP = 2.5;
const INSIDE_GAP = 1;
const OUTSIDE_GAP = 1.5;
const MAX_OUTSIDE_DISTANCE = 25;
const MIN_INSIDE_FONT = 2.5;

const TYPE_LABELS = {
  door: "ドア",
  window: "窓",
  outlet: "コンセント",
  pillar: "柱",
};

const serializeSvg = (svg) => {
  const serializer = new XMLSerializer();
  return serializer.serializeToString(svg);
};

const formatMeters = (mm) => {
  const meters = Number(mm) / 1000;
  if (!Number.isFinite(meters)) return "0.0";
  const truncated = Math.floor(meters * 10) / 10;
  return truncated.toFixed(1);
};

const estimateTextWidth = (text, fontSize) =>
  Math.max(1, text.length) * fontSize * 0.56;

const getLabelBox = (lines, fontSize, scale) => {
  const lineHeight = (fontSize * LABEL_LINE_HEIGHT) / scale;
  const widths = lines.map((line) =>
    estimateTextWidth(line, fontSize) / scale,
  );
  return {
    width: Math.max(...widths, 1) + (LABEL_PADDING * 2) / scale,
    height: lines.length * lineHeight + (LABEL_PADDING * 2) / scale,
    lineHeight,
  };
};

const fitFontSizeForBox = (lines, fontSize, scale, aabb, minFont, gap) => {
  let nextSize = fontSize;
  while (nextSize > minFont) {
    const { width, height } = getLabelBox(lines, nextSize, scale);
    if (
      width <= aabb.w - gap / scale &&
      height <= aabb.h - gap / scale
    ) {
      return nextSize;
    }
    nextSize -= 0.5;
  }
  return minFont;
};

const canFitInside = (lines, fontSize, scale, aabb, gap) => {
  const { width, height } = getLabelBox(lines, fontSize, scale);
  return (
    width <= aabb.w - gap / scale &&
    height <= aabb.h - gap / scale
  );
};

const getTextBox = ({ x, y, text, fontSize, scale, anchor = "start" }) => {
  const width = estimateTextWidth(text, fontSize) / scale;
  const height = (fontSize * 1.1) / scale;
  const offsetX =
    anchor === "middle" ? width / 2 : anchor === "end" ? width : 0;
  return {
    x: x - offsetX,
    y: y - height,
    width,
    height,
  };
};

const getRotatedTextBox = ({ x, y, text, fontSize, scale }) => {
  const width = estimateTextWidth(text, fontSize) / scale;
  const height = (fontSize * 1.1) / scale;
  return {
    x: x - height / 2,
    y: y - width / 2,
    width: height,
    height: width,
  };
};

const rangesOverlap = (aStart, aEnd, bStart, bEnd) =>
  Math.min(aEnd, bEnd) - Math.max(aStart, bStart) > 0;

const getRoomLabelPositions = (room, rooms, scale) => {
  const hasAbove = rooms.some(
    (other) =>
      other.id !== room.id &&
      other.y + other.height <= room.y &&
      rangesOverlap(
        other.x,
        other.x + other.width,
        room.x,
        room.x + room.width,
      ),
  );
  const hasLeft = rooms.some(
    (other) =>
      other.id !== room.id &&
      other.x + other.width <= room.x &&
      rangesOverlap(
        other.y,
        other.y + other.height,
        room.y,
        room.y + room.height,
      ),
  );
  const widthY = hasAbove
    ? room.y + room.height + 6 / scale
    : room.y - 6 / scale;
  const widthX = room.x + room.width / 2;
  const heightX = hasLeft
    ? room.x + room.width + 10 / scale
    : room.x - 6 / scale;
  const heightAnchor = hasLeft ? "start" : "middle";
  return {
    nameX: room.x + 6 / scale,
    nameY: room.y - 6 / scale,
    widthX,
    widthY,
    heightX,
    heightY: room.y + room.height / 2,
    heightAnchor,
  };
};

const intersects = (a, b) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

const defaultTrianglePoints = (width, height) => [
  { x: width / 2, y: 0 },
  { x: 0, y: height },
  { x: width, y: height },
];

const getTrianglePoints = (fixture) => {
  if (Array.isArray(fixture.trianglePoints) && fixture.trianglePoints.length) {
    return fixture.trianglePoints;
  }
  return defaultTrianglePoints(fixture.width, fixture.height);
};

const buildLegendLines = (entries, fontSize, maxWidth) => {
  if (!entries.length) return [];
  const byRoom = new Map();
  entries.forEach((entry) => {
    const list = byRoom.get(entry.roomId) ?? {
      roomName: entry.roomName ?? "未割当",
      items: [],
    };
    list.items.push(entry);
    byRoom.set(entry.roomId, list);
  });

  const lines = [];
  byRoom.forEach((group) => {
    const items = group.items
      .map((item) => `${item.number}. ${item.text}`)
      .join(" / ");
    const prefix = `${group.roomName}: `;
    const raw = `${prefix}${items}`;
    if (estimateTextWidth(raw, fontSize) <= maxWidth) {
      lines.push(raw);
      return;
    }

    const tokens = items.split(" / ").map((token) => `${token} / `);
    let current = prefix;
    tokens.forEach((token, index) => {
      const next = current + token;
      if (estimateTextWidth(next, fontSize) <= maxWidth) {
        current = next;
      } else {
        const trimmed = current.trim();
        lines.push(
          trimmed.endsWith("/") ? trimmed.slice(0, -1).trim() : trimmed,
        );
        current = token;
      }
      if (index === tokens.length - 1) {
        const trimmed = current.trim();
        lines.push(
          trimmed.endsWith("/") ? trimmed.slice(0, -1).trim() : trimmed,
        );
      }
    });
  });

  return lines;
};

const paginateLegend = (lines, fontSize, maxHeight) => {
  if (!lines.length) return [];
  const lineHeight = fontSize * LABEL_LINE_HEIGHT;
  const linesPerPage = Math.max(1, Math.floor(maxHeight / lineHeight));
  const pages = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }
  return pages;
};

const buildRoundedPath = (x, y, w, h, radius) => {
  const tl = Math.min(radius?.tl ?? 0, w / 2, h / 2);
  const tr = Math.min(radius?.tr ?? 0, w / 2, h / 2);
  const br = Math.min(radius?.br ?? 0, w / 2, h / 2);
  const bl = Math.min(radius?.bl ?? 0, w / 2, h / 2);
  return [
    `M ${x + tl} ${y}`,
    `H ${x + w - tr}`,
    tr ? `A ${tr} ${tr} 0 0 1 ${x + w} ${y + tr}` : `L ${x + w} ${y}`,
    `V ${y + h - br}`,
    br ? `A ${br} ${br} 0 0 1 ${x + w - br} ${y + h}` : `L ${x + w} ${y + h}`,
    `H ${x + bl}`,
    bl ? `A ${bl} ${bl} 0 0 1 ${x} ${y + h - bl}` : `L ${x} ${y + h}`,
    `V ${y + tl}`,
    tl ? `A ${tl} ${tl} 0 0 1 ${x + tl} ${y}` : `L ${x} ${y}`,
    "Z",
  ]
    .filter(Boolean)
    .join(" ");
};

const degreesToRadius = (deg, w, h) => {
  const clamped = Math.max(0, Math.min(90, Number(deg) || 0));
  return (clamped / 90) * (Math.min(w, h) / 2);
};

const toCornerRadius = (radius, w, h) => ({
  tl: degreesToRadius(radius?.tl, w, h),
  tr: degreesToRadius(radius?.tr, w, h),
  br: degreesToRadius(radius?.br, w, h),
  bl: degreesToRadius(radius?.bl, w, h),
});

export default function ExportPreviewModal({
  rooms,
  furnitures,
  gridMM,
  onClose,
}) {
  const previewRef = useRef(null);
  const svgRef = useRef(null);
  const dragStateRef = useRef(null);
  const [labelOverrides, setLabelOverrides] = useState({});
  const [editState, setEditState] = useState(null);

  const safeRooms = Array.isArray(rooms) ? rooms : [];
  const safeFurnitures = Array.isArray(furnitures) ? furnitures : [];

  const layout = useMemo(() => {
    const bounds = getRoomsBounds(safeRooms);
    const safeBounds =
      bounds.width && bounds.height
        ? bounds
        : { minX: 0, minY: 0, width: 1, height: 1 };

    const baseScale = Math.min(
      (A4.w - PAGE_MARGIN * 2) / safeBounds.width,
      (A4.h - PAGE_MARGIN * 2) / safeBounds.height,
    );

    const layoutBounds = safeBounds;
    const build = (scale) => {
      const placedBoxes = [];
      const legendEntries = [];
      const counters = new Map();
      const furnitureLabels = [];
      const fixtureLabels = [];
      const obstacles = [];
      const obstacleById = new Map();

      const addFixedBox = (box) => {
        if (!box) return;
        placedBoxes.push(box);
      };

      safeFurnitures.forEach((item) => {
        const room = safeRooms.find((r) => r.id === item.roomId);
        const baseX = room ? room.x + item.x : item.x;
        const baseY = room ? room.y + item.y : item.y;
        const centerX = baseX + item.width / 2;
        const centerY = baseY + item.height / 2;
        const { w, h } = getDisplaySize(item);
        const pad = EDGE_GAP / scale;
        const obstacle = {
          id: item.id,
          x: centerX - w / 2 - pad,
          y: centerY - h / 2 - pad,
          width: w + pad * 2,
          height: h + pad * 2,
        };
        obstacles.push(obstacle);
        obstacleById.set(item.id, obstacle);
      });

      safeRooms.forEach((room) => {
        (room.fixtures ?? []).forEach((fixture) => {
          const baseX = room.x + fixture.x;
          const baseY = room.y + fixture.y;
          const centerX = baseX + fixture.width / 2;
          const centerY = baseY + fixture.height / 2;
          const { w, h } = getDisplaySize({
            width: fixture.width,
            height: fixture.height,
            rotation: fixture.rotation,
          });
          const pad = EDGE_GAP / scale;
          const obstacle = {
            id: fixture.id,
            x: centerX - w / 2 - pad,
            y: centerY - h / 2 - pad,
            width: w + pad * 2,
            height: h + pad * 2,
          };
          obstacles.push(obstacle);
          obstacleById.set(fixture.id, obstacle);
        });
      });

      const pushPlaced = (box) => {
        placedBoxes.push(box);
      };

      const canPlace = (box, ownObstacle) => {
        if (placedBoxes.some((placed) => intersects(placed, box))) return false;
        return !obstacles.some(
          (obstacle) =>
            obstacle !== ownObstacle && intersects(obstacle, box),
        );
      };

      const overlapsRoom = (box) =>
        safeRooms.some((room) =>
          intersects(box, {
            x: room.x,
            y: room.y,
            width: room.width,
            height: room.height,
          }),
        );


      const placeLabel = (aabb, ownObstacle, lines, fontSize, allowInside) => {
        const box = getLabelBox(lines, fontSize, scale);
        const innerMinX = aabb.x + INSIDE_GAP / scale;
        const innerMinY = aabb.y + INSIDE_GAP / scale;
        const innerMaxX = aabb.x + aabb.w - INSIDE_GAP / scale - box.width;
        const innerMaxY = aabb.y + aabb.h - INSIDE_GAP / scale - box.height;
        if (allowInside && innerMaxX >= innerMinX && innerMaxY >= innerMinY) {
          const centerX = aabb.cx - box.width / 2;
          const centerY = aabb.cy - box.height / 2;
        const step = 3 / scale;
        const rings = 8;
          for (let ring = 0; ring <= rings; ring += 1) {
            for (let dx = -ring; dx <= ring; dx += 1) {
              for (let dy = -ring; dy <= ring; dy += 1) {
                if (ring > 0 && Math.abs(dx) !== ring && Math.abs(dy) !== ring) {
                  continue;
                }
                const candidateBox = {
                  x: Math.min(
                    innerMaxX,
                    Math.max(innerMinX, centerX + dx * step),
                  ),
                  y: Math.min(
                    innerMaxY,
                    Math.max(innerMinY, centerY + dy * step),
                  ),
                  width: box.width,
                  height: box.height,
                };
                if (canPlace(candidateBox, ownObstacle)) {
                  pushPlaced(candidateBox);
                  return {
                    ...candidateBox,
                    lines,
                    fontSize,
                    lineHeight: box.lineHeight,
                  };
                }
              }
            }
          }
        }

        const candidates = [
          {
            x: aabb.cx - box.width / 2,
            y: aabb.cy - box.height / 2,
            inside: true,
          },
          {
            x: aabb.cx - box.width / 2,
            y: aabb.y - box.height - OUTSIDE_GAP / scale,
          },
          {
            x: aabb.cx - box.width / 2,
            y: aabb.y + aabb.h + OUTSIDE_GAP / scale,
          },
          {
            x: aabb.x + aabb.w + OUTSIDE_GAP / scale,
            y: aabb.cy - box.height / 2,
          },
          {
            x: aabb.x - box.width - OUTSIDE_GAP / scale,
            y: aabb.cy - box.height / 2,
          },
        ];

        for (const candidate of candidates) {
          const candidateBox = {
            x: candidate.x,
            y: candidate.y,
            width: box.width,
            height: box.height,
          };
          if (
            candidate.inside &&
            (candidateBox.x < aabb.x + EDGE_GAP / scale ||
              candidateBox.y < aabb.y + EDGE_GAP / scale ||
              candidateBox.x + candidateBox.width >
                aabb.x + aabb.w - EDGE_GAP / scale ||
              candidateBox.y + candidateBox.height >
                aabb.y + aabb.h - EDGE_GAP / scale)
          ) {
            continue;
          }
          if (!candidate.inside) {
            const dx =
              candidateBox.x > aabb.x + aabb.w
                ? candidateBox.x - (aabb.x + aabb.w)
                : candidateBox.x + candidateBox.width < aabb.x
                  ? aabb.x - (candidateBox.x + candidateBox.width)
                  : 0;
            const dy =
              candidateBox.y > aabb.y + aabb.h
                ? candidateBox.y - (aabb.y + aabb.h)
                : candidateBox.y + candidateBox.height < aabb.y
                  ? aabb.y - (candidateBox.y + candidateBox.height)
                  : 0;
            if (Math.hypot(dx, dy) > MAX_OUTSIDE_DISTANCE / scale) {
              continue;
            }
            if (overlapsRoom(candidateBox)) {
              continue;
            }
          }
          if (canPlace(candidateBox, ownObstacle)) {
            pushPlaced(candidateBox);
            return { ...candidateBox, lines, fontSize, lineHeight: box.lineHeight };
          }
        }

        const step = 4 / scale;
        const maxRing = 4;
        for (let ring = 1; ring <= maxRing; ring += 1) {
          for (let dx = -ring; dx <= ring; dx += 1) {
            for (let dy = -ring; dy <= ring; dy += 1) {
              if (Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue;
              const candidateBox = {
                x: aabb.cx - box.width / 2 + dx * step,
                y: aabb.cy - box.height / 2 + dy * step,
                width: box.width,
                height: box.height,
              };
              if (canPlace(candidateBox, ownObstacle)) {
                pushPlaced(candidateBox);
                return {
                  ...candidateBox,
                  lines,
                  fontSize,
                  lineHeight: box.lineHeight,
                };
              }
            }
          }
        }

        return null;
      };

      const addLegendEntry = (room, text) => {
        const current = counters.get(room?.id) ?? 0;
        const next = current + 1;
        counters.set(room?.id, next);
        legendEntries.push({
          roomId: room?.id ?? "unassigned",
          roomName: room?.name ?? "未割当",
          number: next,
          text,
        });
        return next;
      };

      safeRooms.forEach((room) => {
        const positions = getRoomLabelPositions(room, safeRooms, scale);

        addFixedBox(
          getTextBox({
            x: positions.nameX,
            y: positions.nameY,
            text: room.name,
            fontSize: LABEL_FONT,
            scale,
          }),
        );
        addFixedBox(
          getTextBox({
            x: positions.widthX,
            y: positions.widthY,
            text: formatMeters(room.width),
            fontSize: ROOM_SIZE_FONT,
            scale,
            anchor: "middle",
          }),
        );
        addFixedBox(
          getRotatedTextBox({
            x: positions.heightX,
            y: positions.heightY,
            text: formatMeters(room.height),
            fontSize: ROOM_SIZE_FONT,
            scale,
            anchor: positions.heightAnchor,
          }),
        );
      });

      safeFurnitures.forEach((item) => {
        const override = labelOverrides[`furniture:${item.id}`] ?? {};
        const room = safeRooms.find((r) => r.id === item.roomId);
        const baseX = room ? room.x + item.x : item.x;
        const baseY = room ? room.y + item.y : item.y;
        const centerX = baseX + item.width / 2;
        const centerY = baseY + item.height / 2;
        const { w, h } = getDisplaySize(item);
        const aabb = {
          x: centerX - w / 2,
          y: centerY - h / 2,
          w,
          h,
          cx: centerX,
          cy: centerY,
        };
        const insideBounds = {
          x: baseX,
          y: baseY,
          w: item.width,
          h: item.height,
          cx: baseX + item.width / 2,
          cy: baseY + item.height / 2,
        };
        const obstacle = obstacleById.get(item.id) ?? {
          x: aabb.x,
          y: aabb.y,
          width: aabb.w,
          height: aabb.h,
        };
        const name = item.name?.trim() ? item.name : "家具";
        const size = `${formatMeters(item.width)} × ${formatMeters(
          item.height,
        )}`;
        const memo = item.memo?.trim();
        const lines = memo ? [name, size, memo] : [name, size];
        const fittedFont = fitFontSizeForBox(
          lines,
          LABEL_FONT,
          scale,
          insideBounds,
          MIN_INSIDE_FONT,
          INSIDE_GAP,
        );
        if (override.moveToLegend) {
          const number = addLegendEntry(
            room,
            `${name} ${size}${memo ? ` / ${memo}` : ""}`,
          );
          furnitureLabels.push({
            id: item.id,
            number,
            numberOnly: true,
            x: aabb.cx - 3 / scale,
            y: aabb.cy + 3 / scale,
            fontSize: LABEL_FONT,
          });
          return;
        }
        const allowInside = canFitInside(
          lines,
          fittedFont,
          scale,
          insideBounds,
          INSIDE_GAP,
        );
        const label = placeLabel(
          insideBounds,
          obstacle,
          lines,
          fittedFont,
          allowInside,
        );
        if (label) {
          furnitureLabels.push({ id: item.id, ...label });
        } else {
          const number = addLegendEntry(room, `${name} ${size}${memo ? ` / ${memo}` : ""}`);
          furnitureLabels.push({
            id: item.id,
            number,
            numberOnly: true,
            x: aabb.cx - 3 / scale,
            y: aabb.cy + 3 / scale,
            fontSize: LABEL_FONT,
          });
        }
      });

      safeRooms.forEach((room) => {
        (room.fixtures ?? []).forEach((fixture) => {
          const override = labelOverrides[`fixture:${fixture.id}`] ?? {};
          const baseX = room.x + fixture.x;
          const baseY = room.y + fixture.y;
          const centerX = baseX + fixture.width / 2;
          const centerY = baseY + fixture.height / 2;
          const labelName = TYPE_LABELS[fixture.type] ?? fixture.type;
          const size =
            fixture.type === "window" || fixture.type === "door"
              ? `${formatMeters(fixture.width)}`
              : fixture.type === "outlet"
                ? ""
                : `${formatMeters(fixture.width)} × ${formatMeters(fixture.height)}`;
          const memo = fixture.memo?.trim();
          const lines =
            fixture.type === "window"
              ? memo
                ? [`${labelName}: ${size}`, memo]
                : [`${labelName}: ${size}`]
              : fixture.type === "door"
                ? memo
                  ? [`${labelName}: ${size}`, memo]
                  : [`${labelName}: ${size}`]
                : fixture.type === "outlet"
                  ? memo
                    ? [labelName, memo]
                    : [labelName]
                  : memo
                    ? [labelName, size, memo]
                    : [labelName, size];
          const { w, h } = getDisplaySize({
            width: fixture.width,
            height: fixture.height,
            rotation: fixture.rotation,
          });
          const aabb = {
            x: centerX - w / 2,
            y: centerY - h / 2,
            w,
            h,
            cx: centerX,
            cy: centerY,
          };
          const fittedFont = fitFontSizeForBox(
            lines,
            LABEL_FONT,
            scale,
            aabb,
            MIN_INSIDE_FONT,
            INSIDE_GAP,
          );
          const obstacle = obstacleById.get(fixture.id) ?? {
            x: aabb.x,
            y: aabb.y,
            width: aabb.w,
            height: aabb.h,
          };
          if (override.moveToLegend) {
            const number = addLegendEntry(
              room,
              `${labelName} ${size}${memo ? ` / ${memo}` : ""}`,
            );
            fixtureLabels.push({
              id: fixture.id,
              number,
              numberOnly: true,
              x: aabb.cx - 3 / scale,
              y: aabb.cy + 3 / scale,
              fontSize: LABEL_FONT,
            });
            return;
          }
          const allowInside = canFitInside(
            lines,
            fittedFont,
            scale,
            aabb,
            INSIDE_GAP,
          );
          const label = placeLabel(
            aabb,
            obstacle,
            lines,
            fittedFont,
            allowInside,
          );
          if (label) {
            fixtureLabels.push({ id: fixture.id, ...label });
          } else {
            const number = addLegendEntry(
              room,
              `${labelName} ${size}${memo ? ` / ${memo}` : ""}`,
            );
            fixtureLabels.push({
              id: fixture.id,
              number,
              numberOnly: true,
              x: aabb.cx - 3 / scale,
              y: aabb.cy + 3 / scale,
              fontSize: LABEL_FONT,
            });
          }
        });
      });

      const labelBoxes = [
        ...furnitureLabels
          .filter((label) => !label.numberOnly)
          .map((label) => ({
            x: label.x,
            y: label.y,
            width: label.width,
            height: label.height,
          })),
        ...fixtureLabels
          .filter((label) => !label.numberOnly)
          .map((label) => ({
            x: label.x,
            y: label.y,
            width: label.width,
            height: label.height,
          })),
      ];

      return {
        legendEntries,
        furnitureLabels,
        fixtureLabels,
        labelBoxes,
      };
    };

    const firstPass = build(baseScale);
    const contentBounds = {
      minX: safeBounds.minX,
      minY: safeBounds.minY,
      width: safeBounds.width,
      height: safeBounds.height,
    };

    const maxLegendWidth = A4.w - PAGE_MARGIN * 2;
    let legendFontSize = LABEL_FONT;
    let legendLines = buildLegendLines(
      firstPass.legendEntries,
      legendFontSize,
      maxLegendWidth,
    );
    let legendPages = paginateLegend(
      legendLines,
      legendFontSize,
      A4.h - PAGE_MARGIN * 2,
    );

    while (
      legendPages.length > 1 &&
      legendFontSize > MIN_LEGEND_FONT
    ) {
      legendFontSize -= 0.5;
      legendLines = buildLegendLines(
        firstPass.legendEntries,
        legendFontSize,
        maxLegendWidth,
      );
      legendPages = paginateLegend(
        legendLines,
        legendFontSize,
        A4.h - PAGE_MARGIN * 2,
      );
    }

    const legendHeight =
      legendLines.length * legendFontSize * LABEL_LINE_HEIGHT;
    const legendHeightForScale = legendPages.length > 1 ? 0 : legendHeight;
    const contentTop = PAGE_MARGIN + LABEL_FONT * 2.6;
    const contentBottom =
      A4.h - PAGE_MARGIN - legendHeightForScale - LEGEND_GAP;
    const availableHeight = Math.max(1, contentBottom - contentTop);
    const scaleByHeight =
      availableHeight > 0
        ? availableHeight / contentBounds.height
        : baseScale;
    const scaleByWidth =
      (A4.w - PAGE_MARGIN * 2) / contentBounds.width;
    const renderScale = Math.min(scaleByWidth, scaleByHeight);

    const finalPass = build(renderScale);
    const boundsWithLabels = finalPass.labelBoxes.reduce(
      (acc, box) => ({
        minX: Math.min(acc.minX, box.x),
        minY: Math.min(acc.minY, box.y),
        maxX: Math.max(acc.maxX, box.x + box.width),
        maxY: Math.max(acc.maxY, box.y + box.height),
      }),
      {
        minX: safeBounds.minX,
        minY: safeBounds.minY,
        maxX: safeBounds.minX + safeBounds.width,
        maxY: safeBounds.minY + safeBounds.height,
      },
    );
    const offsetX =
      (A4.w - (boundsWithLabels.maxX - boundsWithLabels.minX) * renderScale) / 2 -
      boundsWithLabels.minX * renderScale;
    const offsetY =
      contentTop +
      (availableHeight -
        (boundsWithLabels.maxY - boundsWithLabels.minY) * renderScale) /
        2 -
      boundsWithLabels.minY * renderScale;

    const finalLegendLines = buildLegendLines(
      finalPass.legendEntries,
      legendFontSize,
      maxLegendWidth,
    );
    const finalLegendPages = paginateLegend(
      finalLegendLines,
      legendFontSize,
      A4.h - PAGE_MARGIN * 2,
    );

    return {
      bounds: contentBounds,
      scale: renderScale,
      offsetX,
      offsetY,
      legendFontSize,
      legendLines: finalLegendLines,
      legendPages: finalLegendPages,
      furnitureLabels: finalPass.furnitureLabels,
      fixtureLabels: finalPass.fixtureLabels,
    };
  }, [safeRooms, safeFurnitures, labelOverrides]);

  const getContentPoint = (event) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const transformed = point.matrixTransform(svg.getScreenCTM().inverse());
    return {
      x: (transformed.x - layout.offsetX) / layout.scale,
      y: (transformed.y - layout.offsetY) / layout.scale,
    };
  };

  const handleDragStart = (event, type, label) => {
    event.stopPropagation();
    const pointer = getContentPoint(event);
    if (!pointer) return;
    const key = `${type}:${label.id}`;
    const currentOverride = labelOverrides[key] ?? {};
    const currentX = currentOverride.x ?? label.x;
    const currentY = currentOverride.y ?? label.y;
    dragStateRef.current = {
      key,
      offsetX: pointer.x - currentX,
      offsetY: pointer.y - currentY,
    };
  };

  const handleDragMove = (event) => {
    if (!dragStateRef.current) return;
    event.preventDefault();
    const pointer = getContentPoint(event);
    if (!pointer) return;
    const { key, offsetX, offsetY } = dragStateRef.current;
    setLabelOverrides((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        x: pointer.x - offsetX,
        y: pointer.y - offsetY,
      },
    }));
  };

  const handleDragEnd = () => {
    dragStateRef.current = null;
  };

  const openEdit = (type, label) => {
    const key = `${type}:${label.id}`;
    const override = labelOverrides[key] ?? {};
    const text = override.text ?? (label.lines ? label.lines.join("\n") : "");
    setEditState({
      key,
      text,
      fontSize: override.fontSize ?? label.fontSize ?? LABEL_FONT,
      moveToLegend: !!override.moveToLegend,
    });
  };

  const applyEdit = () => {
    if (!editState) return;
    const lines = editState.text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    setLabelOverrides((prev) => ({
      ...prev,
      [editState.key]: {
        ...prev[editState.key],
        lines,
        fontSize: Number(editState.fontSize) || LABEL_FONT,
        moveToLegend: !!editState.moveToLegend,
      },
    }));
    setEditState(null);
  };

  const handleExportPdf = () => {
    if (!previewRef.current) return;
    const svgs = previewRef.current.querySelectorAll("svg");
    if (!svgs.length) return;
    const pages = Array.from(svgs).map((svg) => serializeSvg(svg));
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Room Planner Export</title>
    <style>
      @page { size: A4 landscape; margin: 0; }
      html, body { margin: 0; padding: 0; }
      .page { width: 297mm; height: 210mm; page-break-after: always; }
      svg { width: 297mm; height: 210mm; display: block; }
    </style>
  </head>
  <body>
    ${pages.map((svg) => `<div class="page">${svg}</div>`).join("")}
  </body>
</html>`;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  const gridSize = Math.max(10, Number(gridMM) || 100);
  const gridColor = "#e2e8f0";

  return (
    <div
      className="modal-backdrop export-modal"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="modal export-modal__body"
        role="dialog"
        aria-modal="true"
        aria-label="A4 Export"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__header">
          <h2>プレビュー（横）</h2>
          <button
            className="btn btn--ghost btn--small"
            type="button"
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
        <div className="export-preview" ref={previewRef}>
          <div className="export-preview__page">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${A4.w} ${A4.h}`}
              width={`${A4.w}mm`}
              height={`${A4.h}mm`}
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
            >
              <rect x="0" y="0" width={A4.w} height={A4.h} fill="#fff" />
              <text
                x={PAGE_MARGIN}
                y={PAGE_MARGIN + LABEL_FONT}
                fontSize={LABEL_FONT}
                fill="#1f2937"
              >
                グリッド
              </text>
              <text
                x={PAGE_MARGIN}
                y={PAGE_MARGIN + LABEL_FONT * 2.2}
                fontSize={LABEL_FONT}
                fill="#1f2937"
              >
                {formatMeters(gridSize)}
              </text>
              <defs>
                <pattern
                  id="grid"
                  width={gridSize}
                  height={gridSize}
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                    fill="none"
                    stroke={gridColor}
                    strokeWidth={0.6 / layout.scale}
                  />
                </pattern>
              </defs>
              <g transform={`translate(${layout.offsetX} ${layout.offsetY}) scale(${layout.scale})`}>
                <rect
                  x={layout.bounds.minX}
                  y={layout.bounds.minY}
                  width={layout.bounds.width}
                  height={layout.bounds.height}
                  fill="url(#grid)"
                />
                {safeRooms.map((room) => {
                  const positions = getRoomLabelPositions(
                    room,
                    safeRooms,
                    layout.scale,
                  );
                  return (
                  <g key={room.id}>
                    <path
                      d={buildRoundedPath(
                        room.x,
                        room.y,
                        room.width,
                        room.height,
                        toCornerRadius(room.radius, room.width, room.height),
                      )}
                      fill="none"
                      stroke="#111"
                      strokeWidth={1.1 / layout.scale}
                    />
                    <text
                      x={room.x + 6 / layout.scale}
                      y={room.y - 6 / layout.scale}
                      fontSize={LABEL_FONT / layout.scale}
                      fontWeight="700"
                      fill="#111"
                    >
                      {room.name}
                    </text>
                    <text
                      x={positions.widthX}
                      y={positions.widthY}
                      fontSize={ROOM_SIZE_FONT / layout.scale}
                      textAnchor="middle"
                      fontWeight="700"
                      fill="#111"
                    >
                      {formatMeters(room.width)}
                    </text>
                    <text
                      x={positions.heightX}
                      y={positions.heightY}
                      fontSize={ROOM_SIZE_FONT / layout.scale}
                      textAnchor={positions.heightAnchor}
                      fontWeight="700"
                      fill="#111"
                      transform={`rotate(-90 ${positions.heightX} ${
                        positions.heightY
                      })`}
                    >
                      {formatMeters(room.height)}
                    </text>
                  </g>
                  );
                })}
                {safeFurnitures.map((item) => {
                  const room = safeRooms.find((entry) => entry.id === item.roomId);
                  const baseX = room ? room.x + item.x : item.x;
                  const baseY = room ? room.y + item.y : item.y;
                  const centerX = baseX + item.width / 2;
                  const centerY = baseY + item.height / 2;
                  return (
                    <g key={item.id}>
                      <path
                        d={buildRoundedPath(
                          baseX,
                          baseY,
                          item.width,
                          item.height,
                          toCornerRadius(item.radius, item.width, item.height),
                        )}
                        fill={item.color ?? "#93c5fd"}
                        stroke="#111"
                        strokeWidth={0.8 / layout.scale}
                        transform={
                          item.rotation
                            ? `rotate(${item.rotation} ${centerX} ${centerY})`
                            : undefined
                        }
                      />
                    </g>
                  );
                })}
                {safeRooms.flatMap((room) =>
                  (room.fixtures ?? []).map((fixture) => {
                    const baseX = room.x + fixture.x;
                    const baseY = room.y + fixture.y;
                    const centerX = baseX + fixture.width / 2;
                    const centerY = baseY + fixture.height / 2;
          const labelName = TYPE_LABELS[fixture.type] ?? fixture.type;
                    const isTriangle =
                      fixture.type === "pillar" && fixture.shape === "triangle";
                    const points = isTriangle ? getTrianglePoints(fixture) : [];
                    const pointsString = points
                      .map((point) => `${baseX + point.x},${baseY + point.y}`)
                      .join(" ");
                    return (
                      <g key={fixture.id}>
                        {isTriangle ? (
                          <polygon
                            points={pointsString}
                            fill="#e2e8f0"
                            stroke="#111"
                            strokeWidth={1.6 / layout.scale}
                            transform={
                              fixture.rotation
                                ? `rotate(${fixture.rotation} ${centerX} ${centerY})`
                                : undefined
                            }
                          />
                        ) : (
                          <rect
                            x={baseX}
                            y={baseY}
                            width={fixture.width}
                            height={fixture.height}
                            fill="#e2e8f0"
                            stroke="#111"
                            strokeWidth={1.6 / layout.scale}
                            transform={
                              fixture.rotation
                                ? `rotate(${fixture.rotation} ${centerX} ${centerY})`
                                : undefined
                            }
                          />
                        )}
                      </g>
                    );
                  }),
                )}
                {layout.furnitureLabels.map((label) => {
                  const override = labelOverrides[`furniture:${label.id}`] ?? {};
                  const labelX = override.x ?? label.x;
                  const labelY = override.y ?? label.y;
                  const labelLines = override.lines ?? label.lines;
                  const labelFontSize =
                    override.fontSize ?? label.fontSize ?? LABEL_FONT;
                  return (
                  <g key={label.id}>
                    {label.numberOnly ? (
                      <text
                        x={labelX}
                        y={labelY}
                        fontSize={LABEL_FONT / layout.scale}
                        textAnchor="middle"
                        fill="#111"
                        onMouseDown={(event) =>
                          handleDragStart(event, "furniture", label)
                        }
                        onDoubleClick={() => openEdit("furniture", label)}
                      >
                        {label.number}
                      </text>
                    ) : (
                      <g
                        onMouseDown={(event) =>
                          handleDragStart(event, "furniture", label)
                        }
                        onDoubleClick={() => openEdit("furniture", label)}
                      >
                        {labelLines.map((line, index) => (
                          <text
                            key={line}
                            x={labelX + LABEL_PADDING / layout.scale}
                            y={
                              labelY +
                              LABEL_PADDING / layout.scale +
                              (label.lineHeight ??
                                (labelFontSize * LABEL_LINE_HEIGHT) /
                                  layout.scale) *
                                (index + 0.9)
                            }
                            fontSize={labelFontSize / layout.scale}
                            fill="#111"
                          >
                            {line}
                          </text>
                        ))}
                      </g>
                    )}
                  </g>
                  );
                })}
                {layout.fixtureLabels.map((label) => {
                  const override = labelOverrides[`fixture:${label.id}`] ?? {};
                  const labelX = override.x ?? label.x;
                  const labelY = override.y ?? label.y;
                  const labelLines = override.lines ?? label.lines;
                  const labelFontSize =
                    override.fontSize ?? label.fontSize ?? LABEL_FONT;
                  return (
                  <g key={label.id}>
                    {label.numberOnly ? (
                      <text
                        x={labelX}
                        y={labelY}
                        fontSize={LABEL_FONT / layout.scale}
                        textAnchor="middle"
                        fill="#111"
                        onMouseDown={(event) =>
                          handleDragStart(event, "fixture", label)
                        }
                        onDoubleClick={() => openEdit("fixture", label)}
                      >
                        {label.number}
                      </text>
                    ) : (
                      <g
                        onMouseDown={(event) =>
                          handleDragStart(event, "fixture", label)
                        }
                        onDoubleClick={() => openEdit("fixture", label)}
                      >
                        {labelLines.map((line, index) => (
                          <text
                            key={line}
                            x={labelX + LABEL_PADDING / layout.scale}
                            y={
                              labelY +
                              LABEL_PADDING / layout.scale +
                              (label.lineHeight ??
                                (labelFontSize * LABEL_LINE_HEIGHT) /
                                  layout.scale) *
                                (index + 0.9)
                            }
                            fontSize={labelFontSize / layout.scale}
                            fill="#111"
                          >
                            {line}
                          </text>
                        ))}
                      </g>
                    )}
                  </g>
                  );
                })}
              </g>
              {layout.legendPages.length === 1 && (
                <g>
                  {layout.legendPages[0].map((line, index) => (
                    <text
                      key={line}
                      x={PAGE_MARGIN}
                      y={
                        A4.h -
                        PAGE_MARGIN -
                        (layout.legendPages[0].length - index - 0.4) *
                          layout.legendFontSize *
                          LABEL_LINE_HEIGHT
                      }
                      fontSize={layout.legendFontSize}
                      fill="#111"
                    >
                      {line}
                    </text>
                  ))}
                </g>
              )}
            </svg>
          </div>
          {layout.legendPages.length > 1 &&
            layout.legendPages.map((pageLines, pageIndex) => (
              <div key={pageIndex} className="export-preview__page">
                <svg viewBox={`0 0 ${A4.w} ${A4.h}`} width={`${A4.w}mm`} height={`${A4.h}mm`}>
                  <rect x="0" y="0" width={A4.w} height={A4.h} fill="#fff" />
                  {pageLines.map((line, index) => (
                    <text
                      key={`${pageIndex}-${line}`}
                      x={PAGE_MARGIN}
                      y={
                        PAGE_MARGIN +
                        layout.legendFontSize * LABEL_LINE_HEIGHT * (index + 1)
                      }
                      fontSize={layout.legendFontSize}
                      fill="#111"
                    >
                      {line}
                    </text>
                  ))}
                </svg>
              </div>
            ))}
          <div className="export-preview__actions">
            <button className="btn" type="button" onClick={handleExportPdf}>
              PDFを書き出す
            </button>
            <p className="muted">A4 横で出力されます。</p>
          </div>
        </div>
        {editState && (
          <div className="export-edit-backdrop" role="presentation">
            <div className="export-edit" role="dialog" aria-modal="true">
              <h3>ラベル編集</h3>
              <label>
                テキスト（改行で分割）
                <textarea
                  rows={4}
                  value={editState.text}
                  onChange={(event) =>
                    setEditState((prev) => ({
                      ...prev,
                      text: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                文字サイズ
                <input
                  type="number"
                  step="0.5"
                  min="4"
                  value={editState.fontSize}
                  onChange={(event) =>
                    setEditState((prev) => ({
                      ...prev,
                      fontSize: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="export-edit__checkbox">
                <input
                  type="checkbox"
                  checked={editState.moveToLegend}
                  onChange={(event) =>
                    setEditState((prev) => ({
                      ...prev,
                      moveToLegend: event.target.checked,
                    }))
                  }
                />
                注釈へ移動
              </label>
              <div className="export-edit__actions">
                <button
                  className="btn btn--ghost btn--small"
                  type="button"
                  onClick={() => setEditState(null)}
                >
                  キャンセル
                </button>
                <button className="btn btn--small" type="button" onClick={applyEdit}>
                  反映
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}








