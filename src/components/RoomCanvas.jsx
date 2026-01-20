import React, { useCallback, useEffect, useRef } from "react";
import { CONFIG } from "../config.js";
import { getScale, getDisplaySize } from "../utils/layout.js";

export default function RoomCanvas({ room, furnitures, selectedId, dispatch }) {
  const svgRef = useRef(null);
  const dragRef = useRef({ active: false, id: null, offsetX: 0, offsetY: 0 });
  const handlerRef = useRef({ onMouseMove: null, onMouseUp: null });

  const scale = getScale(room);
  const width = room.width * scale;
  const height = room.height * scale;

  const onMouseMove = useCallback(
    event => {
      if (!dragRef.current.active || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const { id, offsetX, offsetY } = dragRef.current;
      if (!id) return;

      const x =
        (event.clientX - rect.left - CONFIG.margin - offsetX) / scale;
      const y =
        (event.clientY - rect.top - CONFIG.margin - offsetY) / scale;

      dispatch({ type: "MOVE_FURNITURE", payload: { id, x, y } });
    },
    [dispatch, scale]
  );

  const stopDragging = useCallback(() => {
    dragRef.current = { active: false, id: null, offsetX: 0, offsetY: 0 };
    const { onMouseMove: moveHandler, onMouseUp: upHandler } =
      handlerRef.current;
    if (moveHandler) window.removeEventListener("mousemove", moveHandler);
    if (upHandler) window.removeEventListener("mouseup", upHandler);
  }, []);

  const onMouseUp = useCallback(() => {
    stopDragging();
  }, [stopDragging]);

  const startDrag = (event, id) => {
    const target = furnitures.find(item => item.id === id);
    if (!target || !svgRef.current) return;

    dispatch({ type: "SELECT_FURNITURE", payload: id });
    handlerRef.current = { onMouseMove, onMouseUp };

    const rect = svgRef.current.getBoundingClientRect();
    dragRef.current = {
      active: true,
      id,
      offsetX:
        event.clientX -
        rect.left -
        (CONFIG.margin + target.x * scale),
      offsetY:
        event.clientY -
        rect.top -
        (CONFIG.margin + target.y * scale)
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  useEffect(() => {
    handlerRef.current = { onMouseMove, onMouseUp };
  }, [onMouseMove, onMouseUp]);

  useEffect(() => {
    return () => {
      stopDragging();
    };
  }, [stopDragging]);

  const gridLines = [];
  for (let x = 0; x <= room.width; x += CONFIG.gridMM) {
    const px = CONFIG.margin + x * scale;
    gridLines.push(
      <line
        key={`grid-x-${x}`}
        x1={px}
        y1={CONFIG.margin}
        x2={px}
        y2={CONFIG.margin + height}
        stroke="#ddd"
      />
    );
  }

  for (let y = 0; y <= room.height; y += CONFIG.gridMM) {
    const py = CONFIG.margin + y * scale;
    gridLines.push(
      <line
        key={`grid-y-${y}`}
        x1={CONFIG.margin}
        y1={py}
        x2={CONFIG.margin + width}
        y2={py}
        stroke="#ddd"
      />
    );
  }

  return (
    <div className="canvas-wrap">
      <svg
        ref={svgRef}
        width={width + CONFIG.margin * 2}
        height={height + CONFIG.margin * 2}
      >
        {gridLines}

        <rect
          x={CONFIG.margin}
          y={CONFIG.margin}
          width={width}
          height={height}
          fill="none"
          stroke="#333"
          strokeWidth="2"
        />

        <text
          x={CONFIG.margin + width / 2}
          y={CONFIG.margin - 10}
          textAnchor="middle"
        >
          {room.width} mm
        </text>

        <text
          x={CONFIG.margin - 20}
          y={CONFIG.margin + height / 2}
          transform={`rotate(-90 ${CONFIG.margin - 20} ${
            CONFIG.margin + height / 2
          })`}
          textAnchor="middle"
        >
          {room.height} mm
        </text>

        <text x={CONFIG.margin} y={CONFIG.margin + height + 25} fontSize="12">
          Grid: {CONFIG.gridMM} mm
        </text>

        {furnitures.map(item => {
          const { w, h } = getDisplaySize(item);
          const x = CONFIG.margin + item.x * scale;
          const y = CONFIG.margin + item.y * scale;

          return (
            <g
              key={item.id}
              onMouseDown={event => startDrag(event, item.id)}
            >
              <rect
                x={x}
                y={y}
                width={w * scale}
                height={h * scale}
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
