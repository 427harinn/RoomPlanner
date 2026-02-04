import React, { useCallback, useEffect, useRef, useState } from "react";
import { CONFIG } from "../config.js";
import {
  getScaleForRooms,
  getRoomsBounds,
  getDisplaySize,
} from "../utils/layout.js";

export default function RoomCanvas({
  rooms,
  furnitures,
  selectedId,
  selectedFixtureId,
  activeRoomId,
  viewMode,
  viewRoomId,
  canToggleViewMode,
  onToggleViewMode,
  gridMM,
  isMobile,
  dispatch,
}) {
  const ROOM_LABEL_MAX = 20;
  const ROOM_DIM_MAX = 30;
  const FURN_LABEL_MAX = 64;
  const FURN_DIM_MAX = 58;
  const FIXTURE_COLORS = {
    door: "#0f172a",
    window: "#38bdf8",
    outlet: "#f59e0b",
    pillar: "#64748b",
  };
  const formatMeters = (value) => {
    const meters = value / 1000;
    return `${meters.toFixed(5).replace(/\.?0+$/, "")} m`;
  };
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [isDraggingRoom, setIsDraggingRoom] = useState(false);
  const [containerSize, setContainerSize] = useState({
    width: CONFIG.maxW + CONFIG.margin * 2,
    height: CONFIG.maxH + CONFIG.margin * 2,
  });
  const dragRef = useRef({
    active: false,
    kind: null,
    id: null,
    roomId: null,
    wall: null,
    resizeHandle: null,
    resizeTarget: null,
    resizeBase: null,
    resizeRotation: null,
    resizeStart: null,
    vertexIndex: null,
    offsetX: 0,
    offsetY: 0,
    scale: null,
    bounds: null,
    lastRoomPos: null,
  });
  const scrollRef = useRef({ rafId: null, dx: 0, dy: 0 });
  const handlerRef = useRef({ onMouseMove: null, onMouseUp: null });
  const handleGridDoubleClick = useCallback(() => {
    const currentMeters = Number((gridMM / 1000).toFixed(5)).toString();
    const next = window.prompt("Grid size (m):", currentMeters);
    if (next === null) return;
    const parsed = Number(next);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    dispatch({
      type: "SET_GRID_MM",
      payload: Math.max(1, Math.round(parsed * 1000)),
    });
  }, [dispatch, gridMM]);

  const visibleRooms =
    viewMode === "room" && viewRoomId
      ? rooms.filter((room) => room.id === viewRoomId)
      : rooms;
  const liveBounds =
    viewMode === "room" && viewRoomId && visibleRooms[0]
      ? {
          minX: 0,
          minY: 0,
          width: visibleRooms[0].width,
          height: visibleRooms[0].height,
        }
      : getRoomsBounds(visibleRooms);
  const origin =
    viewMode === "room" && viewRoomId && visibleRooms[0]
      ? { x: visibleRooms[0].x, y: visibleRooms[0].y }
      : { x: 0, y: 0 };
  const maxW = Math.max(1, containerSize.width - CONFIG.margin * 2);
  const maxH = Math.max(1, containerSize.height - CONFIG.margin * 2);
  const liveScale = getScaleForRooms(visibleRooms, maxW, maxH);
  const scale =
    dragRef.current.active &&
    dragRef.current.kind === "room" &&
    dragRef.current.scale
      ? dragRef.current.scale
      : liveScale;
  const CANVAS_PADDING_MM = 20000;
  const expandBounds = (base, next) => {
    if (!base) return next;
    if (!next) return base;
    const baseMaxX = base.minX + base.width;
    const baseMaxY = base.minY + base.height;
    const nextMaxX = next.minX + next.width;
    const nextMaxY = next.minY + next.height;
    const minX = Math.min(base.minX, next.minX);
    const minY = Math.min(base.minY, next.minY);
    const maxX = Math.max(baseMaxX, nextMaxX);
    const maxY = Math.max(baseMaxY, nextMaxY);
    return { minX, minY, width: maxX - minX, height: maxY - minY };
  };
  const bounds =
    dragRef.current.active &&
    dragRef.current.kind === "room" &&
    dragRef.current.bounds
      ? expandBounds(dragRef.current.bounds, liveBounds)
      : liveBounds;
  const padPx = isMobile ? 0 : CANVAS_PADDING_MM * scale;
  const width = bounds.width * scale + padPx * 2;
  const height = bounds.height * scale + padPx * 2;
  const offsetX = CONFIG.margin + padPx - bounds.minX * scale;
  const offsetY = CONFIG.margin + padPx - bounds.minY * scale;

  const snapRoomPosition = useCallback(
    (room) => {
      const thresholdMm = 24 / scale;
      const others = rooms.filter((other) => other.id !== room.id);

      const candidatesX = [];
      const roomInsets = getStraightInsets(room);
      const roomLeft = room.x + roomInsets.left;
      const roomRight = room.x + room.width - roomInsets.right;

      others.forEach((other) => {
        const otherInsets = getStraightInsets(other);
        const otherLeft = other.x + otherInsets.left;
        const otherRight = other.x + other.width - otherInsets.right;
        candidatesX.push({
          x: otherLeft - roomInsets.left,
          delta: roomLeft - otherLeft,
        });
        candidatesX.push({
          x: otherRight - roomInsets.left,
          delta: roomLeft - otherRight,
        });
        candidatesX.push({
          x: otherLeft - (room.width - roomInsets.right),
          delta: roomRight - otherLeft,
        });
        candidatesX.push({
          x: otherRight - (room.width - roomInsets.right),
          delta: roomRight - otherRight,
        });
      });

      let snappedX = room.x;
      let bestX = thresholdMm;
      candidatesX.forEach((candidate) => {
        const distance = Math.abs(candidate.delta);
        if (distance <= bestX) {
          bestX = distance;
          snappedX = candidate.x;
        }
      });

      const candidatesY = [];
      const roomTop = room.y + roomInsets.top;
      const roomBottom = room.y + room.height - roomInsets.bottom;

      others.forEach((other) => {
        const otherInsets = getStraightInsets(other);
        const otherTop = other.y + otherInsets.top;
        const otherBottom = other.y + other.height - otherInsets.bottom;
        candidatesY.push({
          y: otherTop - roomInsets.top,
          delta: roomTop - otherTop,
        });
        candidatesY.push({
          y: otherBottom - roomInsets.top,
          delta: roomTop - otherBottom,
        });
        candidatesY.push({
          y: otherTop - (room.height - roomInsets.bottom),
          delta: roomBottom - otherTop,
        });
        candidatesY.push({
          y: otherBottom - (room.height - roomInsets.bottom),
          delta: roomBottom - otherBottom,
        });
      });

      let snappedY = room.y;
      let bestY = thresholdMm;
      candidatesY.forEach((candidate) => {
        const distance = Math.abs(candidate.delta);
        if (distance <= bestY) {
          bestY = distance;
          snappedY = candidate.y;
        }
      });

      return { x: snappedX, y: snappedY };
    },
    [rooms, scale],
  );

  const getRoundedRectPath = (x, y, w, h, radius) => {
    const clamp = (value) => Math.max(0, Math.min(value, w / 2, h / 2));
    const tl = clamp(radius?.tl ?? 0);
    const tr = clamp(radius?.tr ?? 0);
    const br = clamp(radius?.br ?? 0);
    const bl = clamp(radius?.bl ?? 0);

    return [
      `M ${x + tl} ${y}`,
      `L ${x + w - tr} ${y}`,
      tr > 0 ? `A ${tr} ${tr} 0 0 1 ${x + w} ${y + tr}` : `L ${x + w} ${y}`,
      `L ${x + w} ${y + h - br}`,
      br > 0
        ? `A ${br} ${br} 0 0 1 ${x + w - br} ${y + h}`
        : `L ${x + w} ${y + h}`,
      `L ${x + bl} ${y + h}`,
      bl > 0 ? `A ${bl} ${bl} 0 0 1 ${x} ${y + h - bl}` : `L ${x} ${y + h}`,
      `L ${x} ${y + tl}`,
      tl > 0 ? `A ${tl} ${tl} 0 0 1 ${x + tl} ${y}` : `L ${x} ${y}`,
      "Z",
    ].join(" ");
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

  const rotatePoint = (point, center, deg) => {
    if (!deg) return point;
    const rad = (deg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return {
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos,
    };
  };

  const rotateVector = (vector, deg) => {
    if (!deg) return vector;
    const rad = (deg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
      x: vector.x * cos - vector.y * sin,
      y: vector.x * sin + vector.y * cos,
    };
  };

  const defaultTrianglePoints = (width, height) => [
    { x: width / 2, y: 0 },
    { x: 0, y: height },
    { x: width, y: height },
  ];

  const getRotatedAabb = (w, h, rotation) => {
    const rad = ((Number(rotation) || 0) * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    return { w: w * cos + h * sin, h: w * sin + h * cos };
  };

  const getRotatedCorners = (x, y, w, h, rotation) => {
    const center = { x: x + w / 2, y: y + h / 2 };
    return [
      rotatePoint({ x, y }, center, rotation),
      rotatePoint({ x: x + w, y }, center, rotation),
      rotatePoint({ x: x + w, y: y + h }, center, rotation),
      rotatePoint({ x, y: y + h }, center, rotation),
    ];
  };

  const getFixtureBaseSize = (fixture) => {
    const width = Math.max(40, fixture.width ?? 120);
    const height = Math.max(40, fixture.height ?? 120);
    return { w: width, h: height };
  };

  const getFixtureAabbSize = (fixture) => {
    const base = getFixtureBaseSize(fixture);
    return getRotatedAabb(base.w, base.h, fixture.rotation);
  };

  const getFixtureRect = (room, fixture) => {
    const { w, h } = getFixtureBaseSize(fixture);
    return {
      x: fixture.x ?? room.width / 2 - w / 2,
      y: fixture.y ?? room.height / 2 - h / 2,
      w,
      h,
    };
  };

  const getFixtureAabbRect = (room, fixture) => {
    const base = getFixtureBaseSize(fixture);
    const aabb = getFixtureAabbSize(fixture);
    const centerX = (fixture.x ?? room.width / 2 - base.w / 2) + base.w / 2;
    const centerY = (fixture.y ?? room.height / 2 - base.h / 2) + base.h / 2;
    return {
      x: centerX - aabb.w / 2,
      y: centerY - aabb.h / 2,
      w: aabb.w,
      h: aabb.h,
    };
  };

  const getTrianglePoints = (fixture) => {
    if (
      Array.isArray(fixture.trianglePoints) &&
      fixture.trianglePoints.length === 3
    ) {
      return fixture.trianglePoints;
    }
    return defaultTrianglePoints(fixture.width ?? 200, fixture.height ?? 200);
  };

  const getTriangleWorldPoints = (room, fixture) => {
    const points = getTrianglePoints(fixture);
    const { w, h } = getFixtureBaseSize(fixture);
    const center = {
      x: (room?.x ?? 0) + (fixture.x ?? 0) + w / 2,
      y: (room?.y ?? 0) + (fixture.y ?? 0) + h / 2,
    };
    return points.map((point) =>
      rotatePoint(
        {
          x: (room?.x ?? 0) + (fixture.x ?? 0) + point.x,
          y: (room?.y ?? 0) + (fixture.y ?? 0) + point.y,
        },
        center,
        fixture.rotation ?? 0,
      ),
    );
  };

  const getStraightInsets = (room) => {
    const r = toCornerRadius(room.radius, room.width, room.height);
    return {
      left: Math.min(r.tl || 0, r.bl || 0),
      right: Math.min(r.tr || 0, r.br || 0),
      top: Math.min(r.tl || 0, r.tr || 0),
      bottom: Math.min(r.bl || 0, r.br || 0),
    };
  };

  const isPointInsideRoundedRect = (px, py, rect, radius) => {
    const { x, y, w, h } = rect;
    if (px < x || px > x + w || py < y || py > y + h) return false;
    const r = toCornerRadius(radius, w, h);

    if (r.tl > 0 && px < x + r.tl && py < y + r.tl) {
      const dx = px - (x + r.tl);
      const dy = py - (y + r.tl);
      if (dx * dx + dy * dy > r.tl * r.tl) return false;
    }
    if (r.tr > 0 && px > x + w - r.tr && py < y + r.tr) {
      const dx = px - (x + w - r.tr);
      const dy = py - (y + r.tr);
      if (dx * dx + dy * dy > r.tr * r.tr) return false;
    }
    if (r.br > 0 && px > x + w - r.br && py > y + h - r.br) {
      const dx = px - (x + w - r.br);
      const dy = py - (y + h - r.br);
      if (dx * dx + dy * dy > r.br * r.br) return false;
    }
    if (r.bl > 0 && px < x + r.bl && py > y + h - r.bl) {
      const dx = px - (x + r.bl);
      const dy = py - (y + h - r.bl);
      if (dx * dx + dy * dy > r.bl * r.bl) return false;
    }
    return true;
  };

  const onMouseMove = useCallback(
    (event) => {
      if (!dragRef.current.active || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const {
        id,
        kind,
        roomId,
        wall,
        resizeHandle,
        resizeTarget,
        resizeBase,
        resizeRotation,
        resizeStart,
        vertexIndex,
        offsetX: dragOffsetX,
        offsetY: dragOffsetY,
      } = dragRef.current;
      if (!id) return;

      if (kind === "vertex") {
        const room = rooms.find((item) => item.id === roomId);
        if (!room) return;
        const fixture = (room.fixtures ?? []).find((item) => item.id === id);
        if (!fixture) return;
        const roomX = offsetX + (room.x - origin.x) * scale;
        const roomY = offsetY + (room.y - origin.y) * scale;
        const localX = (event.clientX - rect.left - roomX) / scale;
        const localY = (event.clientY - rect.top - roomY) / scale;
        const clampedX = Math.max(0, Math.min(localX, room.width));
        const clampedY = Math.max(0, Math.min(localY, room.height));
        const { w, h } = getFixtureAabbSize(fixture);
        const center = {
          x: fixture.x + w / 2,
          y: fixture.y + h / 2,
        };
        const inverse = rotatePoint(
          { x: clampedX, y: clampedY },
          center,
          -(fixture.rotation ?? 0),
        );
        const points = getTrianglePoints(fixture).map((point) => ({
          x: point.x,
          y: point.y,
        }));
        if (vertexIndex !== null && vertexIndex !== undefined) {
          points[vertexIndex] = {
            x: inverse.x - fixture.x,
            y: inverse.y - fixture.y,
          };
        }
        const xs = points.map((p) => p.x);
        const ys = points.map((p) => p.y);
        let minX = Math.min(...xs);
        let minY = Math.min(...ys);
        let maxX = Math.max(...xs);
        let maxY = Math.max(...ys);
        const minSize = 40;
        if (maxX - minX < minSize) {
          maxX = minX + minSize;
        }
        if (maxY - minY < minSize) {
          maxY = minY + minSize;
        }
        const nextX = fixture.x + minX;
        const nextY = fixture.y + minY;
        const normalizedPoints = points.map((p) => ({
          x: p.x - minX,
          y: p.y - minY,
        }));
        dispatch({
          type: "UPDATE_FIXTURE",
          payload: {
            roomId,
            fixtureId: id,
            updates: {
              x: nextX,
              y: nextY,
              width: maxX - minX,
              height: maxY - minY,
              trianglePoints: normalizedPoints,
            },
          },
        });
        return;
      }

      if (kind === "resize" && resizeBase && resizeHandle && resizeTarget) {
        const deltaScreenX = (event.clientX - resizeStart.x) / scale;
        const deltaScreenY = (event.clientY - resizeStart.y) / scale;
        const rotation = resizeRotation ?? 0;
        const localDelta =
          resizeTarget !== "room" && rotation
            ? rotateVector({ x: deltaScreenX, y: deltaScreenY }, -rotation)
            : { x: deltaScreenX, y: deltaScreenY };
        let nextX = resizeBase.x;
        let nextY = resizeBase.y;
        let nextW = resizeBase.w;
        let nextH = resizeBase.h;
        const minSize = 80;
        const hasW = resizeHandle.includes("w");
        const hasE = resizeHandle.includes("e");
        const hasN = resizeHandle.includes("n");
        const hasS = resizeHandle.includes("s");
        if (hasE) {
          nextW = resizeBase.w + localDelta.x;
        }
        if (hasW) {
          nextW = resizeBase.w - localDelta.x;
          nextX = resizeBase.x + localDelta.x;
        }
        if (hasS) {
          nextH = resizeBase.h + localDelta.y;
        }
        if (hasN) {
          nextH = resizeBase.h - localDelta.y;
          nextY = resizeBase.y + localDelta.y;
        }
        if (event.shiftKey) {
          const ratio = resizeBase.w / resizeBase.h || 1;
          if ((hasW || hasE) && (hasN || hasS)) {
            if (Math.abs(localDelta.x) > Math.abs(localDelta.y)) {
              nextH = nextW / ratio;
              if (hasN) {
                nextY = resizeBase.y + (resizeBase.h - nextH);
              }
            } else {
              nextW = nextH * ratio;
              if (hasW) {
                nextX = resizeBase.x + (resizeBase.w - nextW);
              }
            }
          } else if (hasW || hasE) {
            nextH = nextW / ratio;
            nextY = resizeBase.y + (resizeBase.h - nextH) / 2;
          } else if (hasN || hasS) {
            nextW = nextH * ratio;
            nextX = resizeBase.x + (resizeBase.w - nextW) / 2;
          }
        }
        if (nextW < minSize) {
          nextW = minSize;
          if (hasW) {
            nextX = resizeBase.x + (resizeBase.w - minSize);
          }
        }
        if (nextH < minSize) {
          nextH = minSize;
          if (hasN) {
            nextY = resizeBase.y + (resizeBase.h - minSize);
          }
        }

        if (resizeTarget === "room") {
          dispatch({
            type: "UPDATE_ROOM",
            payload: {
              id,
              updates: {
                x: nextX,
                y: nextY,
                width: nextW,
                height: nextH,
              },
            },
          });
          return;
        }

        if (resizeTarget === "furniture") {
          const room = rooms.find((item) => item.id === roomId);
          const localX = room ? nextX - room.x : nextX;
          const localY = room ? nextY - room.y : nextY;
          dispatch({
            type: "UPDATE_FURNITURE",
            payload: {
              id,
              updates: {
                x: localX,
                y: localY,
                width: nextW,
                height: nextH,
              },
            },
          });
          return;
        }

        if (resizeTarget === "fixture") {
          const targetRoom = rooms.find((item) => item.id === roomId);
          if (!targetRoom) return;
          const roomMinX = targetRoom.x;
          const roomMinY = targetRoom.y;
          const roomMaxX = targetRoom.x + targetRoom.width;
          const roomMaxY = targetRoom.y + targetRoom.height;
          let clampedX = nextX;
          let clampedY = nextY;
          let clampedW = nextW;
          let clampedH = nextH;

          if (clampedX < roomMinX) {
            clampedW -= roomMinX - clampedX;
            clampedX = roomMinX;
          }
          if (clampedY < roomMinY) {
            clampedH -= roomMinY - clampedY;
            clampedY = roomMinY;
          }
          if (clampedX + clampedW > roomMaxX) {
            clampedW = roomMaxX - clampedX;
          }
          if (clampedY + clampedH > roomMaxY) {
            clampedH = roomMaxY - clampedY;
          }

          clampedW = Math.max(minSize, clampedW);
          clampedH = Math.max(minSize, clampedH);
          if (clampedX + clampedW > roomMaxX) {
            clampedX = Math.max(roomMinX, roomMaxX - clampedW);
          }
          if (clampedY + clampedH > roomMaxY) {
            clampedY = Math.max(roomMinY, roomMaxY - clampedH);
          }

          const localX = clampedX - targetRoom.x;
          const localY = clampedY - targetRoom.y;
          dispatch({
            type: "UPDATE_FIXTURE",
            payload: {
              roomId,
              fixtureId: id,
              updates: {
                x: localX,
                y: localY,
                width: clampedW,
                height: clampedH,
              },
            },
          });
          return;
        }
      }

      if (kind === "room") {
        if (viewMode === "room") return;
        const room = rooms.find((item) => item.id === id);
        if (!room) return;
        const x =
          (event.clientX - rect.left - offsetX - dragOffsetX) / scale +
          origin.x;
        const y =
          (event.clientY - rect.top - offsetY - dragOffsetY) / scale + origin.y;
        const snapped = snapRoomPosition({ ...room, x, y });
        const lastRoomPos = dragRef.current.lastRoomPos ?? {
          x: snapped.x,
          y: snapped.y,
        };
        const deltaRoomX = snapped.x - lastRoomPos.x;
        const deltaRoomY = snapped.y - lastRoomPos.y;
        dragRef.current.lastRoomPos = { x: snapped.x, y: snapped.y };
        dispatch({
          type: "MOVE_ROOM",
          payload: { id, x: snapped.x, y: snapped.y },
        });
        const container = containerRef.current;
        if (container && !isMobile) {
          const roomX = offsetX + (snapped.x - origin.x) * scale;
          const roomY = offsetY + (snapped.y - origin.y) * scale;
          const roomW = room.width * scale;
          const roomH = room.height * scale;
          const viewLeft = container.scrollLeft;
          const viewTop = container.scrollTop;
          const viewRight = viewLeft + container.clientWidth;
          const viewBottom = viewTop + container.clientHeight;
          const targetLeft = roomX;
          const targetTop = roomY;
          const targetRight = roomX + roomW;
          const targetBottom = roomY + roomH;

          let dx = 0;
          let dy = 0;
          if (deltaRoomX < 0 && targetLeft < viewLeft) {
            dx = targetLeft - viewLeft;
          } else if (deltaRoomX > 0 && targetRight > viewRight) {
            dx = targetRight - viewRight;
          }

          if (deltaRoomY < 0 && targetTop < viewTop) {
            dy = targetTop - viewTop;
          } else if (deltaRoomY > 0 && targetBottom > viewBottom) {
            dy = targetBottom - viewBottom;
          }

          if (dx !== 0 || dy !== 0) {
            scrollRef.current.dx = dx;
            scrollRef.current.dy = dy;
            if (!scrollRef.current.rafId) {
              const step = () => {
                const maxStep = 12;
                const ease = 0.18;
                const nextDx = scrollRef.current.dx;
                const nextDy = scrollRef.current.dy;
                const moveX = Math.max(
                  -maxStep,
                  Math.min(maxStep, nextDx * ease),
                );
                const moveY = Math.max(
                  -maxStep,
                  Math.min(maxStep, nextDy * ease),
                );
                container.scrollLeft += moveX;
                container.scrollTop += moveY;
                scrollRef.current.dx = nextDx - moveX;
                scrollRef.current.dy = nextDy - moveY;
                if (
                  Math.abs(scrollRef.current.dx) < 0.5 &&
                  Math.abs(scrollRef.current.dy) < 0.5
                ) {
                  scrollRef.current.dx = 0;
                  scrollRef.current.dy = 0;
                  scrollRef.current.rafId = null;
                  return;
                }
                scrollRef.current.rafId = window.requestAnimationFrame(step);
              };
              scrollRef.current.rafId = window.requestAnimationFrame(step);
            }
          }
        }
        return;
      }

      if (kind === "fixture") {
        const room = rooms.find((item) => item.id === roomId);
        if (!room) return;
        const fixture = (room.fixtures ?? []).find((item) => item.id === id);
        if (!fixture) return;
        const roomX = offsetX + (room.x - origin.x) * scale;
        const roomY = offsetY + (room.y - origin.y) * scale;
        const localX = (event.clientX - rect.left - roomX) / scale;
        const localY = (event.clientY - rect.top - roomY) / scale;
        const baseSize = getFixtureBaseSize(fixture);
        const currentAabb = getFixtureAabbSize(fixture);
        const w = currentAabb.w;
        const h = currentAabb.h;
        let nextX = localX - dragOffsetX / scale;
        let nextY = localY - dragOffsetY / scale;
        nextX = Math.max(0, Math.min(nextX, room.width - w));
        nextY = Math.max(0, Math.min(nextY, room.height - h));
        const snapThreshold = 60;
        let snapSide = null;
        let rotationUpdate = fixture.rotation;
        let baseX = nextX + w / 2 - baseSize.w / 2;
        let baseY = nextY + h / 2 - baseSize.h / 2;
        let corners = getRotatedCorners(
          baseX,
          baseY,
          baseSize.w,
          baseSize.h,
          rotationUpdate,
        );
        let minX = Math.min(...corners.map((point) => point.x));
        let maxX = Math.max(...corners.map((point) => point.x));
        let minY = Math.min(...corners.map((point) => point.y));
        let maxY = Math.max(...corners.map((point) => point.y));
        const wallDistances = [
          { side: "left", dist: minX },
          { side: "right", dist: room.width - maxX },
          { side: "top", dist: minY },
          { side: "bottom", dist: room.height - maxY },
        ];
        const nearestWall = wallDistances.reduce((best, current) =>
          current.dist < best.dist ? current : best,
        );
        if (nearestWall.dist <= snapThreshold) {
          snapSide = nearestWall.side;
          if (snapSide === "left") {
            baseX -= minX;
          } else if (snapSide === "right") {
            baseX += room.width - maxX;
          } else if (snapSide === "top") {
            baseY -= minY;
          } else if (snapSide === "bottom") {
            baseY += room.height - maxY;
          }
        }
        corners = getRotatedCorners(
          baseX,
          baseY,
          baseSize.w,
          baseSize.h,
          rotationUpdate,
        );
        minX = Math.min(...corners.map((point) => point.x));
        maxX = Math.max(...corners.map((point) => point.x));
        minY = Math.min(...corners.map((point) => point.y));
        maxY = Math.max(...corners.map((point) => point.y));
        if (fixture.type !== "pillar" && snapSide) {
          rotationUpdate =
            snapSide === "left" || snapSide === "right" ? 90 : 0;
        }
        if (snapSide === "left" || snapSide === "right" || snapSide === "top" || snapSide === "bottom") {
          const rotatedCorners = getRotatedCorners(
            baseX,
            baseY,
            baseSize.w,
            baseSize.h,
            rotationUpdate,
          );
          const rotatedMinX = Math.min(...rotatedCorners.map((point) => point.x));
          const rotatedMaxX = Math.max(...rotatedCorners.map((point) => point.x));
          const rotatedMinY = Math.min(...rotatedCorners.map((point) => point.y));
          const rotatedMaxY = Math.max(...rotatedCorners.map((point) => point.y));
          if (snapSide === "left") {
            baseX += 0 - rotatedMinX;
          } else if (snapSide === "right") {
            baseX += room.width - rotatedMaxX;
          } else if (snapSide === "top") {
            baseY += 0 - rotatedMinY;
          } else if (snapSide === "bottom") {
            baseY += room.height - rotatedMaxY;
          }
        }
        const activeAabb = getRotatedAabb(
          baseSize.w,
          baseSize.h,
          rotationUpdate,
        );
        const centerX = baseX + baseSize.w / 2;
        const centerY = baseY + baseSize.h / 2;
        let aabbX = centerX - activeAabb.w / 2;
        let aabbY = centerY - activeAabb.h / 2;
        aabbX = Math.max(0, Math.min(aabbX, room.width - activeAabb.w));
        aabbY = Math.max(0, Math.min(aabbY, room.height - activeAabb.h));
        baseX = aabbX + activeAabb.w / 2 - baseSize.w / 2;
        baseY = aabbY + activeAabb.h / 2 - baseSize.h / 2;
        dispatch({
          type: "UPDATE_FIXTURE",
          payload: {
            roomId,
            fixtureId: id,
            updates: {
              x: baseX,
              y: baseY,
              rotation: rotationUpdate,
            },
          },
        });
        return;
      }

      const target = furnitures.find((item) => item.id === id);
      if (!target) return;
      const room = rooms.find((item) => item.id === target.roomId);

      if (room) {
        const worldX =
          (event.clientX - rect.left - offsetX - dragOffsetX) / scale +
          origin.x;
        const worldY =
          (event.clientY - rect.top - offsetY - dragOffsetY) / scale + origin.y;
        const x = worldX - room.x;
        const y = worldY - room.y;
        dispatch({
          type: "MOVE_FURNITURE",
          payload: { id, x, y, absX: worldX, absY: worldY },
        });
      } else {
        const x =
          (event.clientX - rect.left - offsetX - dragOffsetX) / scale +
          origin.x;
        const y =
          (event.clientY - rect.top - offsetY - dragOffsetY) / scale + origin.y;
        dispatch({
          type: "MOVE_FURNITURE",
          payload: { id, x, y, absX: x, absY: y },
        });
      }
    },
    [dispatch, furnitures, rooms, scale, offsetX, offsetY, origin.x, origin.y],
  );

  const stopDragging = useCallback(() => {
    dragRef.current = {
      active: false,
      kind: null,
      id: null,
      roomId: null,
      wall: null,
      resizeHandle: null,
      resizeTarget: null,
      resizeBase: null,
      resizeRotation: null,
      resizeStart: null,
      vertexIndex: null,
      offsetX: 0,
      offsetY: 0,
      scale: null,
      bounds: null,
      lastRoomPos: null,
    };
    if (scrollRef.current.rafId) {
      window.cancelAnimationFrame(scrollRef.current.rafId);
      scrollRef.current.rafId = null;
    }
    scrollRef.current.dx = 0;
    scrollRef.current.dy = 0;
    setIsDraggingRoom(false);
    const { onMouseMove: moveHandler, onMouseUp: upHandler } =
      handlerRef.current;
    if (moveHandler) window.removeEventListener("pointermove", moveHandler);
    if (upHandler) window.removeEventListener("pointerup", upHandler);
    if (upHandler) window.removeEventListener("pointercancel", upHandler);
  }, []);

  const onMouseUp = useCallback(() => {
    dispatch({ type: "END_DRAG" });
    stopDragging();
  }, [dispatch, stopDragging]);

  const startDrag = (event, id) => {
    event.stopPropagation();
    event.preventDefault();
    const target = furnitures.find((item) => item.id === id);
    if (!target || !svgRef.current) return;
    const room = rooms.find((item) => item.id === target.roomId);
    if (room) {
      dispatch({ type: "BEGIN_DRAG" });
      if (room.id !== activeRoomId) {
        dispatch({ type: "SET_ACTIVE_ROOM", payload: room.id });
      }
    } else {
      dispatch({ type: "BEGIN_DRAG" });
    }
    dispatch({ type: "SELECT_FURNITURE", payload: id });
    handlerRef.current = { onMouseMove, onMouseUp };

    const rect = svgRef.current.getBoundingClientRect();
    const baseX = room ? room.x + target.x : target.x;
    const baseY = room ? room.y + target.y : target.y;
    dragRef.current = {
      active: true,
      kind: "furniture",
      id,
      roomId: null,
      wall: null,
      offsetX:
        event.clientX - rect.left - (offsetX + (baseX - origin.x) * scale),
      offsetY:
        event.clientY - rect.top - (offsetY + (baseY - origin.y) * scale),
    };

    window.addEventListener("pointermove", onMouseMove);
    window.addEventListener("pointerup", onMouseUp);
    window.addEventListener("pointercancel", onMouseUp);
  };

  const startRoomDrag = (event, room) => {
    event.stopPropagation();
    event.preventDefault();
    if (room.id !== activeRoomId) {
      dispatch({ type: "SET_ACTIVE_ROOM", payload: room.id });
    }
    if (rooms.length <= 1 || viewMode === "room") return;
    if (!svgRef.current) return;

    dispatch({ type: "BEGIN_DRAG" });
    const rect = svgRef.current.getBoundingClientRect();
    const dragScale = liveScale;
    dragRef.current = {
      active: true,
      kind: "room",
      id: room.id,
      roomId: null,
      wall: null,
      offsetX:
        event.clientX - rect.left - (offsetX + (room.x - origin.x) * scale),
      offsetY:
        event.clientY - rect.top - (offsetY + (room.y - origin.y) * scale),
      scale: dragScale,
      bounds,
      lastRoomPos: { x: room.x, y: room.y },
    };
    setIsDraggingRoom(true);

    window.addEventListener("pointermove", onMouseMove);
    window.addEventListener("pointerup", onMouseUp);
    window.addEventListener("pointercancel", onMouseUp);
  };

  useEffect(() => {
    handlerRef.current = { onMouseMove, onMouseUp };
  }, [onMouseMove, onMouseUp]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width: nextWidth, height: nextHeight } = entry.contentRect;
      setContainerSize({
        width: Math.max(1, nextWidth),
        height: Math.max(1, nextHeight),
      });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      stopDragging();
    };
  }, [stopDragging]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (dragRef.current.active || isMobile) return;
    container.scrollLeft = padPx;
    container.scrollTop = padPx;
  }, [padPx, bounds.minX, bounds.minY, bounds.width, bounds.height, isMobile]);

  const roomGrid = visibleRooms.flatMap((room) => {
    const lines = [];
    const roomX = offsetX + (room.x - origin.x) * scale;
    const roomY = offsetY + (room.y - origin.y) * scale;
    const roomW = room.width * scale;
    const roomH = room.height * scale;
    const clipId = `room-grid-clip-${room.id}`;
    const clipRadius = toCornerRadius(room.radius, roomW, roomH);

    for (let x = 0; x <= room.width; x += gridMM) {
      const px = roomX + x * scale;
      lines.push(
        <line
          key={`grid-x-${room.id}-${x}`}
          x1={px}
          y1={roomY}
          x2={px}
          y2={roomY + roomH}
          stroke="#ddd"
          pointerEvents="none"
        />,
      );
    }

    for (let y = 0; y <= room.height; y += gridMM) {
      const py = roomY + y * scale;
      lines.push(
        <line
          key={`grid-y-${room.id}-${y}`}
          x1={roomX}
          y1={py}
          x2={roomX + roomW}
          y2={py}
          stroke="#ddd"
          pointerEvents="none"
        />,
      );
    }

    return [
      <clipPath key={`${clipId}-def`} id={clipId}>
        <path d={getRoundedRectPath(roomX, roomY, roomW, roomH, clipRadius)} />
      </clipPath>,
      <g key={`${clipId}-lines`} clipPath={`url(#${clipId})`}>
        {lines}
      </g>,
    ];
  });

  return (
    <div
      className={`canvas-wrap${isDraggingRoom ? " canvas-wrap--drag" : ""}`}
      ref={containerRef}
    >
      <div className="canvas-toolbar">
        <button
          className="btn btn--ghost btn--small"
          type="button"
          onClick={onToggleViewMode}
          disabled={viewMode === "all" && !canToggleViewMode}
        >
          {viewMode === "all" ? "部屋のみ表示" : "全体表示"}
        </button>
      </div>
      <svg
        ref={svgRef}
        width={width + CONFIG.margin * 2}
        height={height + CONFIG.margin * 2}
      >
        {roomGrid}

        {visibleRooms.map((room) => {
          const roomX = offsetX + (room.x - origin.x) * scale;
          const roomY = offsetY + (room.y - origin.y) * scale;
          const roomW = room.width * scale;
          const roomH = room.height * scale;
          const isActive = room.id === activeRoomId;
          const roomBase = Math.min(roomW, roomH);
          const labelSize = Math.min(
            ROOM_LABEL_MAX,
            Math.max(8, roomBase * 0.08),
          );
          const dimSize = Math.min(ROOM_DIM_MAX, Math.max(8, roomBase * 0.07));
          const nameOffset = Math.max(6, labelSize * 0.7);
          const sideOffset = Math.max(10, dimSize * 0.7);
          const fixtureElements = (room.fixtures ?? []).map((fixture) => {
            const rect = getFixtureRect(room, fixture);
            const x = roomX + rect.x * scale;
            const y = roomY + rect.y * scale;
            const w = rect.w * scale;
            const h = rect.h * scale;
            const stroke =
              fixture.id === selectedFixtureId
                ? "#ef4444"
                : fixture.type === "pillar"
                  ? "#333"
                  : "#1f2933";
            const strokeWidth =
              fixture.id === selectedFixtureId
                ? "2.5"
                : fixture.type === "pillar"
                  ? "2"
                  : "1";
            const handlePointerDown = (event) => {
              event.stopPropagation();
              event.preventDefault();
              dispatch({ type: "BEGIN_DRAG" });
              const svgRect = svgRef.current?.getBoundingClientRect();
              const aabbRect = getFixtureAabbRect(room, fixture);
              const ax = roomX + aabbRect.x * scale;
              const ay = roomY + aabbRect.y * scale;
              const dragOffsetX = svgRect
                ? event.clientX - (ax + svgRect.left)
                : 0;
              const dragOffsetY = svgRect
                ? event.clientY - (ay + svgRect.top)
                : 0;
              dragRef.current = {
                active: true,
                kind: "fixture",
                id: fixture.id,
                roomId: room.id,
                wall: fixture.wall,
                offsetX: dragOffsetX,
                offsetY: dragOffsetY,
                scale: null,
                bounds: null,
                lastRoomPos: null,
              };
              dispatch({ type: "SELECT_FIXTURE", payload: fixture.id });
              handlerRef.current = { onMouseMove, onMouseUp };
              window.addEventListener("pointermove", onMouseMove);
              window.addEventListener("pointerup", onMouseUp);
              window.addEventListener("pointercancel", onMouseUp);
            };

            if (fixture.type === "pillar" && fixture.shape === "triangle") {
              const rotatedPoints = getTriangleWorldPoints(room, fixture);
              const points = rotatedPoints
                .map(
                  (point) =>
                    `${offsetX + (point.x - origin.x) * scale},${
                      offsetY + (point.y - origin.y) * scale
                    }`,
                )
                .join(" ");
              return (
                <polygon
                  key={fixture.id}
                  points={points}
                  fill={FIXTURE_COLORS[fixture.type] ?? "#475569"}
                  opacity="0.85"
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  onPointerDown={handlePointerDown}
                />
              );
            }

            const centerX = x + w / 2;
            const centerY = y + h / 2;
            const transform = fixture.rotation
              ? `rotate(${fixture.rotation} ${centerX} ${centerY})`
              : undefined;
            return (
              <rect
                key={fixture.id}
                x={x}
                y={y}
                width={w}
                height={h}
                fill={FIXTURE_COLORS[fixture.type] ?? "#475569"}
                opacity="0.85"
                stroke={stroke}
                strokeWidth={strokeWidth}
                transform={transform}
                onPointerDown={handlePointerDown}
              />
            );
          });

          return (
            <g key={room.id}>
              <rect
                x={roomX}
                y={roomY}
                width={roomW}
                height={roomH}
                fill="transparent"
                onPointerDown={(event) => startRoomDrag(event, room)}
              />
              <path
                d={getRoundedRectPath(
                  roomX,
                  roomY,
                  roomW,
                  roomH,
                  toCornerRadius(room.radius, roomW, roomH),
                )}
                fill="none"
                stroke={isActive ? "#ef4444" : "#333"}
                strokeWidth={isActive ? "3" : "2"}
                pointerEvents="none"
              />
              {fixtureElements}
              <text
                x={roomX + 8}
                y={roomY - nameOffset}
                fontSize={labelSize}
                pointerEvents="none"
              >
                {room.name}
              </text>
              <text
                x={roomX + roomW / 2}
                y={roomY - nameOffset}
                textAnchor="middle"
                fontSize={dimSize}
                pointerEvents="none"
              >
                {formatMeters(room.width)}
              </text>
              <text
                x={roomX - sideOffset}
                y={roomY + roomH / 2}
                transform={`rotate(-90 ${roomX - sideOffset} ${
                  roomY + roomH / 2
                })`}
                textAnchor="middle"
                fontSize={dimSize}
                pointerEvents="none"
              >
                {formatMeters(room.height)}
              </text>
            </g>
          );
        })}
        {(() => {
          const getHandleRects = (x, y, w, h) => {
            const size = 8;
            const half = size / 2;
            return [
              { key: "nw", x: x - half, y: y - half, cursor: "nwse-resize" },
              {
                key: "n",
                x: x + w / 2 - half,
                y: y - half,
                cursor: "ns-resize",
              },
              {
                key: "ne",
                x: x + w - half,
                y: y - half,
                cursor: "nesw-resize",
              },
              {
                key: "e",
                x: x + w - half,
                y: y + h / 2 - half,
                cursor: "ew-resize",
              },
              {
                key: "se",
                x: x + w - half,
                y: y + h - half,
                cursor: "nwse-resize",
              },
              {
                key: "s",
                x: x + w / 2 - half,
                y: y + h - half,
                cursor: "ns-resize",
              },
              {
                key: "sw",
                x: x - half,
                y: y + h - half,
                cursor: "nesw-resize",
              },
              {
                key: "w",
                x: x - half,
                y: y + h / 2 - half,
                cursor: "ew-resize",
              },
            ];
          };

          const getRotatedHandleRects = (x, y, w, h, rotation) => {
            if (!rotation) {
              return getHandleRects(x, y, w, h);
            }
            const center = { x: x + w / 2, y: y + h / 2 };
            return getHandleRects(x, y, w, h).map((handle) => {
              const point = rotatePoint(
                { x: handle.x + 4, y: handle.y + 4 },
                center,
                rotation,
              );
              return {
                ...handle,
                x: point.x - 4,
                y: point.y - 4,
              };
            });
          };

          const selectedRoom = rooms.find((item) => item.id === activeRoomId);
          const selectedFurniture = furnitures.find(
            (item) => item.id === selectedId,
          );
          const selectedFixtureRoom = rooms.find((entry) =>
            (entry.fixtures ?? []).some(
              (fixture) => fixture.id === selectedFixtureId,
            ),
          );
          const selectedFixture = selectedFixtureRoom?.fixtures?.find(
            (fixture) => fixture.id === selectedFixtureId,
          );
          let selectedRect = null;
          let selectedTarget = null;
          let selectedMeta = null;
          if (selectedFixture && selectedFixtureRoom) {
            const fixtureRect = getFixtureRect(
              selectedFixtureRoom,
              selectedFixture,
            );
            selectedRect = {
              x: selectedFixtureRoom.x + fixtureRect.x,
              y: selectedFixtureRoom.y + fixtureRect.y,
              w: fixtureRect.w,
              h: fixtureRect.h,
            };
            selectedTarget = "fixture";
            selectedMeta = {
              id: selectedFixture.id,
              roomId: selectedFixtureRoom.id,
              rotation: selectedFixture.rotation ?? 0,
            };
          } else if (selectedFurniture) {
            const { w, h } = getDisplaySize(selectedFurniture);
            const roomForFurniture = rooms.find(
              (item) => item.id === selectedFurniture.roomId,
            );
            const baseX = roomForFurniture
              ? roomForFurniture.x + selectedFurniture.x
              : selectedFurniture.x;
            const baseY = roomForFurniture
              ? roomForFurniture.y + selectedFurniture.y
              : selectedFurniture.y;
            selectedRect = {
              x: baseX,
              y: baseY,
              w: selectedFurniture.width,
              h: selectedFurniture.height,
            };
            selectedTarget = "furniture";
            selectedMeta = {
              id: selectedFurniture.id,
              roomId: roomForFurniture?.id ?? null,
              rotation: selectedFurniture.rotation ?? 0,
            };
          } else if (selectedRoom) {
            selectedRect = {
              x: selectedRoom.x,
              y: selectedRoom.y,
              w: selectedRoom.width,
              h: selectedRoom.height,
            };
            selectedTarget = "room";
            selectedMeta = { id: selectedRoom.id };
          }

          if (
            selectedFixture &&
            selectedFixture.type === "pillar" &&
            selectedFixture.shape === "triangle"
          ) {
            const rotatedPoints = getTriangleWorldPoints(
              selectedFixtureRoom,
              selectedFixture,
            );
            return rotatedPoints.map((point, index) => {
              const cx = offsetX + (point.x - origin.x) * scale;
              const cy = offsetY + (point.y - origin.y) * scale;
              return (
                <circle
                  key={`vertex-${index}`}
                  cx={cx}
                  cy={cy}
                  r={5}
                  fill="#fff"
                  stroke="#1f2933"
                  strokeWidth="1"
                  style={{ cursor: "move" }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    dispatch({ type: "BEGIN_DRAG" });
                    dragRef.current = {
                      active: true,
                      kind: "vertex",
                      id: selectedMeta.id,
                      roomId: selectedMeta.roomId ?? null,
                      wall: null,
                      resizeHandle: null,
                      resizeTarget: null,
                      resizeBase: null,
                      resizeRotation: null,
                      resizeStart: null,
                      vertexIndex: index,
                      offsetX: 0,
                      offsetY: 0,
                      scale: null,
                      bounds: null,
                      lastRoomPos: null,
                    };
                    handlerRef.current = { onMouseMove, onMouseUp };
                    window.addEventListener("pointermove", onMouseMove);
                    window.addEventListener("pointerup", onMouseUp);
                    window.addEventListener("pointercancel", onMouseUp);
                  }}
                />
              );
            });
          }

          const resizeHandles =
            selectedRect && selectedTarget
              ? getRotatedHandleRects(
                  offsetX + (selectedRect.x - origin.x) * scale,
                  offsetY + (selectedRect.y - origin.y) * scale,
                  selectedRect.w * scale,
                  selectedRect.h * scale,
                  selectedTarget === "room" ? 0 : selectedMeta.rotation ?? 0,
                )
              : [];

          return resizeHandles.map((handle) => (
            <rect
              key={`${selectedTarget}-${handle.key}`}
              x={handle.x}
              y={handle.y}
              width={8}
              height={8}
              fill="#fff"
              stroke="#1f2933"
              strokeWidth="1"
              style={{ cursor: handle.cursor }}
              onPointerDown={(event) => {
                event.stopPropagation();
                event.preventDefault();
                dispatch({ type: "BEGIN_DRAG" });
                dragRef.current = {
                  active: true,
                  kind: "resize",
                  id: selectedMeta.id,
                  roomId: selectedMeta.roomId ?? null,
                  wall: null,
                  resizeHandle: handle.key,
                  resizeTarget: selectedTarget,
                  resizeBase: selectedRect,
                  resizeRotation: selectedMeta.rotation ?? 0,
                  resizeStart: {
                    x: event.clientX,
                    y: event.clientY,
                  },
                  offsetX: 0,
                  offsetY: 0,
                  scale: null,
                  bounds: null,
                  lastRoomPos: null,
                  vertexIndex: null,
                };
                handlerRef.current = { onMouseMove, onMouseUp };
                window.addEventListener("pointermove", onMouseMove);
                window.addEventListener("pointerup", onMouseUp);
                window.addEventListener("pointercancel", onMouseUp);
              }}
            />
          ));
        })()}

        <text
          x={CONFIG.margin}
          y={CONFIG.margin + height + 25}
          fontSize={Math.min(64, Math.max(12, 28 * scale))}
          onDoubleClick={handleGridDoubleClick}
        >
          Grid: {formatMeters(gridMM)}
        </text>

        {furnitures
          .filter((item) =>
            viewMode === "room" && viewRoomId
              ? item.roomId === viewRoomId
              : true,
          )
          .map((item) => {
            const { w, h } = getDisplaySize(item);
            const room = rooms.find((entry) => entry.id === item.roomId);
            const baseX = room ? room.x + item.x : item.x;
            const baseY = room ? room.y + item.y : item.y;
            const centerX = baseX + item.width / 2;
            const centerY = baseY + item.height / 2;
            const aabbX = centerX - w / 2;
            const aabbY = centerY - h / 2;
            const isOutsideRoom = !room
              ? true
              : ![
                  { x: aabbX - (room ? room.x : 0), y: aabbY - (room ? room.y : 0) },
                  { x: aabbX - (room ? room.x : 0) + w, y: aabbY - (room ? room.y : 0) },
                  { x: aabbX - (room ? room.x : 0), y: aabbY - (room ? room.y : 0) + h },
                  { x: aabbX - (room ? room.x : 0) + w, y: aabbY - (room ? room.y : 0) + h },
                ].every((point) =>
                  isPointInsideRoundedRect(
                    point.x,
                    point.y,
                    { x: 0, y: 0, w: room.width, h: room.height },
                    room.radius,
                  ),
                );
            const x = offsetX + (baseX - origin.x) * scale;
            const y = offsetY + (baseY - origin.y) * scale;
            const baseW = item.width * scale;
            const baseH = item.height * scale;
            const itemBase = Math.min(baseW, baseH);
            const labelSize = Math.min(
              FURN_LABEL_MAX,
              Math.max(6, itemBase * 0.16),
            );
            const dimSize = Math.min(
              FURN_DIM_MAX,
              Math.max(6, itemBase * 0.13),
            );
            const centerPx = x + baseW / 2;
            const centerPy = y + baseH / 2;
            const transform = item.rotation
              ? `rotate(${item.rotation} ${centerPx} ${centerPy})`
              : undefined;
            const rotationNorm =
              ((Number(item.rotation) || 0) % 360 + 360) % 360;
            const displayWidth =
              rotationNorm === 90 || rotationNorm === 270
                ? item.height
                : item.width;
            const displayHeight =
              rotationNorm === 90 || rotationNorm === 270
                ? item.width
                : item.height;

            return (
              <g
                key={item.id}
                onPointerDown={(event) => startDrag(event, item.id)}
              >
                <path
                  d={getRoundedRectPath(
                    x,
                    y,
                    baseW,
                    baseH,
                    toCornerRadius(item.radius, baseW, baseH),
                  )}
                  fill={isOutsideRoom ? "#f87171" : item.color}
                  stroke={item.id === selectedId ? "red" : "#333"}
                  strokeWidth="2"
                  transform={transform}
                />
                <text
                  x={centerPx}
                  y={centerPy - dimSize * 0.4}
                  textAnchor="middle"
                  fontSize={labelSize}
                >
                  {item.name}
                </text>
                <text
                  x={centerPx}
                  y={centerPy + dimSize * 0.8}
                  textAnchor="middle"
                  fontSize={dimSize}
                >
                  {formatMeters(displayWidth)} × {formatMeters(displayHeight)}
                </text>
              </g>
            );
          })}
      </svg>
    </div>
  );
}
