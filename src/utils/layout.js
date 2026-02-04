import { CONFIG } from "../config.js";

export const getRoomsBounds = (rooms) => {
  if (!rooms || rooms.length === 0) {
    return { minX: 0, minY: 0, width: 0, height: 0 };
  }

  let minX = rooms[0].x;
  let minY = rooms[0].y;
  let maxX = rooms[0].x + rooms[0].width;
  let maxY = rooms[0].y + rooms[0].height;
  rooms.forEach((room) => {
    minX = Math.min(minX, room.x);
    minY = Math.min(minY, room.y);
    maxX = Math.max(maxX, room.x + room.width);
    maxY = Math.max(maxY, room.y + room.height);
  });

  return { minX, minY, width: maxX - minX, height: maxY - minY };
};

export const getScaleForRooms = (
  rooms,
  maxW = CONFIG.maxW,
  maxH = CONFIG.maxH,
) => {
  const bounds = getRoomsBounds(rooms);
  if (!bounds.width || !bounds.height) return 1;
  return Math.min(maxW / bounds.width, maxH / bounds.height);
};

export const getDisplaySize = (furniture) => {
  const rotation = Number(furniture.rotation) || 0;
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const w = Number(furniture.width) || 0;
  const h = Number(furniture.height) || 0;
  return {
    w: w * cos + h * sin,
    h: w * sin + h * cos,
  };
};
