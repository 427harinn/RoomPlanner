import React, { useMemo, useRef } from "react";
import { getRoomsBounds, getDisplaySize } from "../utils/layout.js";

const A4 = { w: 210, h: 297 };
const PAGE_MARGIN = 10;

const serializeSvg = (svg) => {
  const serializer = new XMLSerializer();
  return serializer.serializeToString(svg);
};

export default function ExportPreviewModal({ rooms, furnitures, onClose }) {
  const svgRef = useRef(null);
  const bounds = useMemo(() => getRoomsBounds(rooms), [rooms]);
  const safeBounds =
    bounds.width && bounds.height
      ? bounds
      : { minX: 0, minY: 0, width: 1, height: 1 };
  const scale = Math.min(
    (A4.w - PAGE_MARGIN * 2) / safeBounds.width,
    (A4.h - PAGE_MARGIN * 2) / safeBounds.height,
  );
  const offsetX = PAGE_MARGIN - safeBounds.minX * scale;
  const offsetY = PAGE_MARGIN - safeBounds.minY * scale;

  const handleExportPdf = () => {
    if (!svgRef.current) return;
    const svgMarkup = serializeSvg(svgRef.current);
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Room Planner Export</title>
    <style>
      @page { size: A4; margin: 0; }
      html, body { margin: 0; padding: 0; }
      .page { width: 210mm; height: 297mm; display: flex; align-items: center; justify-content: center; }
      svg { width: 210mm; height: 297mm; }
    </style>
  </head>
  <body>
    <div class="page">${svgMarkup}</div>
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

  return (
    <div className="modal-backdrop export-modal" role="presentation" onClick={onClose}>
      <div
        className="modal export-modal__body"
        role="dialog"
        aria-modal="true"
        aria-label="A4 Export"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__header">
          <h2>A4プレビュー</h2>
          <button className="btn btn--ghost btn--small" type="button" onClick={onClose}>
            閉じる
          </button>
        </div>
        <div className="export-preview">
          <div className="export-preview__page">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${A4.w} ${A4.h}`}
              width={`${A4.w}mm`}
              height={`${A4.h}mm`}
            >
              <rect x="0" y="0" width={A4.w} height={A4.h} fill="#fff" />
              <g transform={`translate(${offsetX} ${offsetY}) scale(${scale})`}>
                {rooms.map((room) => (
                  <g key={room.id}>
                    <rect
                      x={room.x}
                      y={room.y}
                      width={room.width}
                      height={room.height}
                      fill="none"
                      stroke="#111"
                      strokeWidth={2 / scale}
                    />
                    <text
                      x={room.x + 6 / scale}
                      y={room.y - 8 / scale}
                      fontSize={8 / scale}
                      fill="#111"
                    >
                      {room.name}
                    </text>
                  </g>
                ))}
                {furnitures.map((item) => {
                  const room = rooms.find((entry) => entry.id === item.roomId);
                  const baseX = room ? room.x + item.x : item.x;
                  const baseY = room ? room.y + item.y : item.y;
                  const centerX = baseX + item.width / 2;
                  const centerY = baseY + item.height / 2;
                  const { w, h } = getDisplaySize(item);
                  const aabbX = centerX - w / 2;
                  const aabbY = centerY - h / 2;
                  return (
                    <g key={item.id}>
                      <rect
                        x={baseX}
                        y={baseY}
                        width={item.width}
                        height={item.height}
                        fill={item.color ?? "#93c5fd"}
                        stroke="#111"
                        strokeWidth={1.5 / scale}
                        transform={
                          item.rotation
                            ? `rotate(${item.rotation} ${centerX} ${centerY})`
                            : undefined
                        }
                      />
                      <text
                        x={aabbX + 4 / scale}
                        y={aabbY + 10 / scale}
                        fontSize={7 / scale}
                        fill="#111"
                      >
                        {item.name}
                      </text>
                      {item.memo ? (
                        <text
                          x={aabbX + 4 / scale}
                          y={aabbY + 20 / scale}
                          fontSize={6 / scale}
                          fill="#444"
                        >
                          {item.memo}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
                {rooms.flatMap((room) =>
                  (room.fixtures ?? []).map((fixture) => {
                    const baseX = room.x + fixture.x;
                    const baseY = room.y + fixture.y;
                    const centerX = baseX + fixture.width / 2;
                    const centerY = baseY + fixture.height / 2;
                    return (
                      <g key={fixture.id}>
                        <rect
                          x={baseX}
                          y={baseY}
                          width={fixture.width}
                          height={fixture.height}
                          fill="#e2e8f0"
                          stroke="#111"
                          strokeWidth={1 / scale}
                          transform={
                            fixture.rotation
                              ? `rotate(${fixture.rotation} ${centerX} ${centerY})`
                              : undefined
                          }
                        />
                        <text
                          x={baseX + 3 / scale}
                          y={baseY + 10 / scale}
                          fontSize={6 / scale}
                          fill="#111"
                        >
                          {fixture.type}
                        </text>
                        {fixture.memo ? (
                          <text
                            x={baseX + 3 / scale}
                            y={baseY + 18 / scale}
                            fontSize={5.5 / scale}
                            fill="#444"
                          >
                            {fixture.memo}
                          </text>
                        ) : null}
                      </g>
                    );
                  }),
                )}
              </g>
            </svg>
          </div>
          <div className="export-preview__actions">
            <button className="btn" type="button" onClick={handleExportPdf}>
              PDFを書き出す
            </button>
            <p className="muted">プレビューはA4 1ページ固定です。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
