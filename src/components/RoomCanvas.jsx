import React, { useCallback, useEffect, useRef, useState } from "react";
import { CONFIG } from "../config.js";
import { getScaleForRooms, getRoomsBounds, getDisplaySize } from "../utils/layout.js";

export default function RoomCanvas({
  rooms,
  furnitures,
  selectedId,
  activeRoomId,
  dispatch
}) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [isDraggingRoom, setIsDraggingRoom] = useState(false);
  const [containerSize, setContainerSize] = useState({
    width: CONFIG.maxW + CONFIG.margin * 2,
    height: CONFIG.maxH + CONFIG.margin * 2
  });
  const dragRef = useRef({
    active: false,
    kind: null,
    id: null,
    offsetX: 0,
    offsetY: 0,
    scale: null
  });
  const handlerRef = useRef({ onMouseMove: null, onMouseUp: null });

  const liveBounds = getRoomsBounds(rooms);
  const maxW = Math.max(1, containerSize.width - CONFIG.margin * 2);
  const maxH = Math.max(1, containerSize.height - CONFIG.margin * 2);
  const liveScale = getScaleForRooms(rooms, maxW, maxH);
  const scale =
    dragRef.current.active && dragRef.current.kind === "room" && dragRef.current.scale
      ? dragRef.current.scale
      : liveScale;
  const bounds = liveBounds;
  const width = bounds.width * scale;
  const height = bounds.height * scale;
  const offsetX = CONFIG.margin - bounds.minX * scale;
  const offsetY = CONFIG.margin - bounds.minY * scale;

  const snapRoomPosition = useCallback(
    room => {
      const thresholdMm = 24 / scale;
      const others = rooms.filter(other => other.id !== room.id);

      const candidatesX = [];
      const roomLeft = room.x;
      const roomRight = room.x + room.width;

      others.forEach(other => {
        const otherLeft = other.x;
        const otherRight = other.x + other.width;
        candidatesX.push({ x: otherLeft, delta: roomLeft - otherLeft });
        candidatesX.push({ x: otherRight, delta: roomLeft - otherRight });
        candidatesX.push({
          x: otherLeft - room.width,
          delta: roomRight - otherLeft
        });
        candidatesX.push({
          x: otherRight - room.width,
          delta: roomRight - otherRight
        });
      });

      let snappedX = room.x;
      let bestX = thresholdMm;
      candidatesX.forEach(candidate => {
        const distance = Math.abs(candidate.delta);
        if (distance <= bestX) {
          bestX = distance;
          snappedX = candidate.x;
        }
      });

      const candidatesY = [];
      const roomTop = room.y;
      const roomBottom = room.y + room.height;

      others.forEach(other => {
        const otherTop = other.y;
        const otherBottom = other.y + other.height;
        candidatesY.push({ y: otherTop, delta: roomTop - otherTop });
        candidatesY.push({ y: otherBottom, delta: roomTop - otherBottom });
        candidatesY.push({
          y: otherTop - room.height,
          delta: roomBottom - otherTop
        });
        candidatesY.push({
          y: otherBottom - room.height,
          delta: roomBottom - otherBottom
        });
      });

      let snappedY = room.y;
      let bestY = thresholdMm;
      candidatesY.forEach(candidate => {
        const distance = Math.abs(candidate.delta);
        if (distance <= bestY) {
          bestY = distance;
          snappedY = candidate.y;
        }
      });

      return { x: snappedX, y: snappedY };
    },
    [rooms, scale]
  );

  const getRoundedRectPath = (x, y, w, h, radius) => {
    const clamp = value => Math.max(0, Math.min(value, w / 2, h / 2));
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
      "Z"
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
    bl: degreesToRadius(radius?.bl, w, h)
  });

  const onMouseMove = useCallback(
    event => {
      if (!dragRef.current.active || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const {
        id,
        kind,
        offsetX: dragOffsetX,
        offsetY: dragOffsetY
      } = dragRef.current;
      if (!id) return;

      if (kind === "room") {
        const room = rooms.find(item => item.id === id);
        if (!room) return;
        const x = (event.clientX - rect.left - offsetX - dragOffsetX) / scale;
        const y = (event.clientY - rect.top - offsetY - dragOffsetY) / scale;
        const snapped = snapRoomPosition({ ...room, x, y });
        dispatch({
          type: "MOVE_ROOM",
          payload: { id, x: snapped.x, y: snapped.y }
        });
        return;
      }

      const target = furnitures.find(item => item.id === id);
      if (!target) return;
      const room = rooms.find(item => item.id === target.roomId);

      if (room) {
        const x =
          (event.clientX - rect.left - offsetX - dragOffsetX) / scale -
          room.x;
        const y =
          (event.clientY - rect.top - offsetY - dragOffsetY) / scale -
          room.y;
        dispatch({
          type: "MOVE_FURNITURE",
          payload: { id, x, y, absX: room.x + x, absY: room.y + y }
        });
      } else {
        const x =
          (event.clientX - rect.left - offsetX - dragOffsetX) / scale;
        const y =
          (event.clientY - rect.top - offsetY - dragOffsetY) / scale;
        dispatch({
          type: "MOVE_FURNITURE",
          payload: { id, x, y, absX: x, absY: y }
        });
      }
    },
    [dispatch, furnitures, rooms, scale, offsetX, offsetY]
  );

  const stopDragging = useCallback(() => {
    dragRef.current = {
      active: false,
      kind: null,
      id: null,
      offsetX: 0,
      offsetY: 0,
      scale: null
    };
    setIsDraggingRoom(false);
    const { onMouseMove: moveHandler, onMouseUp: upHandler } =
      handlerRef.current;
    if (moveHandler) window.removeEventListener("mousemove", moveHandler);
    if (upHandler) window.removeEventListener("mouseup", upHandler);
  }, []);

  const onMouseUp = useCallback(() => {
    dispatch({ type: "END_DRAG" });
    stopDragging();
  }, [dispatch, stopDragging]);

  const startDrag = (event, id) => {
    event.stopPropagation();
    const target = furnitures.find(item => item.id === id);
    if (!target || !svgRef.current) return;
    const room = rooms.find(item => item.id === target.roomId);
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
      offsetX:
        event.clientX -
        rect.left -
        (offsetX + baseX * scale),
      offsetY:
        event.clientY -
        rect.top -
        (offsetY + baseY * scale)
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const startRoomDrag = (event, room) => {
    event.stopPropagation();
    if (!svgRef.current) return;
    if (room.id !== activeRoomId) {
      dispatch({ type: "SET_ACTIVE_ROOM", payload: room.id });
    }

    dispatch({ type: "BEGIN_DRAG" });
    const rect = svgRef.current.getBoundingClientRect();
    const dragScale = liveScale;
    dragRef.current = {
      active: true,
      kind: "room",
      id: room.id,
      offsetX: event.clientX - rect.left - (offsetX + room.x * scale),
      offsetY: event.clientY - rect.top - (offsetY + room.y * scale),
      scale: dragScale
    };
    setIsDraggingRoom(true);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  useEffect(() => {
    handlerRef.current = { onMouseMove, onMouseUp };
  }, [onMouseMove, onMouseUp]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) return;
      const { width: nextWidth, height: nextHeight } = entry.contentRect;
      setContainerSize({
        width: Math.max(1, nextWidth),
        height: Math.max(1, nextHeight)
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

  const roomGrid = rooms.flatMap(room => {
    const lines = [];
    const roomX = offsetX + room.x * scale;
    const roomY = offsetY + room.y * scale;
    const roomW = room.width * scale;
    const roomH = room.height * scale;

    for (let x = 0; x <= room.width; x += CONFIG.gridMM) {
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
        />
      );
    }

    for (let y = 0; y <= room.height; y += CONFIG.gridMM) {
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
        />
      );
    }

    return lines;
  });

  return (
    <div
      className={`canvas-wrap${isDraggingRoom ? " canvas-wrap--drag" : ""}`}
      ref={containerRef}
    >
      <svg
        ref={svgRef}
        width={width + CONFIG.margin * 2}
        height={height + CONFIG.margin * 2}
      >
        {roomGrid}

        {rooms.map(room => {
          const roomX = offsetX + room.x * scale;
          const roomY = offsetY + room.y * scale;
          const roomW = room.width * scale;
          const roomH = room.height * scale;
          const isActive = room.id === activeRoomId;

          return (
            <g key={room.id}>
              <rect
                x={roomX}
                y={roomY}
                width={roomW}
                height={roomH}
                fill="transparent"
                onMouseDown={event => startRoomDrag(event, room)}
              />
              <path
                d={getRoundedRectPath(
                  roomX,
                  roomY,
                  roomW,
                  roomH,
                  toCornerRadius(room.radius, roomW, roomH)
                )}
                fill="none"
                stroke={isActive ? "#ef4444" : "#333"}
                strokeWidth={isActive ? "3" : "2"}
                pointerEvents="none"
              />
              <text x={roomX + 8} y={roomY - 10} fontSize="12" pointerEvents="none">
                {room.name}
              </text>
              <text
                x={roomX + roomW / 2}
                y={roomY - 10}
                textAnchor="middle"
                pointerEvents="none"
              >
                {room.width} mm
              </text>
              <text
                x={roomX - 20}
                y={roomY + roomH / 2}
                transform={`rotate(-90 ${roomX - 20} ${roomY + roomH / 2})`}
                textAnchor="middle"
                pointerEvents="none"
              >
                {room.height} mm
              </text>
            </g>
          );
        })}

        <text x={CONFIG.margin} y={CONFIG.margin + height + 25} fontSize="12">
          Grid: {CONFIG.gridMM} mm
        </text>

        {furnitures.map(item => {
          const { w, h } = getDisplaySize(item);
          const room = rooms.find(entry => entry.id === item.roomId);
          const baseX = room ? room.x + item.x : item.x;
          const baseY = room ? room.y + item.y : item.y;
          const x = offsetX + baseX * scale;
          const y = offsetY + baseY * scale;

          return (
            <g
              key={item.id}
              onMouseDown={event => startDrag(event, item.id)}
            >
              <path
                d={getRoundedRectPath(
                  x,
                  y,
                  w * scale,
                  h * scale,
                  toCornerRadius(item.radius, w * scale, h * scale)
                )}
                fill={item.color}
                stroke={item.id === selectedId ? "red" : "#333"}
                strokeWidth="2"
              />
              <text x={x + (w * scale) / 2} y={y + (h * scale) / 2 - 6} textAnchor="middle" fontSize="12">
                {item.name}
              </text>
              <text x={x + (w * scale) / 2} y={y + (h * scale) / 2 + 10} textAnchor="middle" fontSize="10">
                {item.width} × {item.height} mm
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
