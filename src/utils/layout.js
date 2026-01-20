import { CONFIG } from "../config.js";

export const getRoomsBounds = rooms => {
  if (!rooms || rooms.length === 0) {
    return { minX: 0, minY: 0, width: 0, height: 0 };
  }

  let maxX = 0;
  let maxY = 0;
  rooms.forEach(room => {
    maxX = Math.max(maxX, room.x + room.width);
    maxY = Math.max(maxY, room.y + room.height);
  });

  return { minX: 0, minY: 0, width: maxX, height: maxY };
};

export const getScaleForRooms = (rooms, maxW = CONFIG.maxW, maxH = CONFIG.maxH) => {
  const bounds = getRoomsBounds(rooms);
  if (!bounds.width || !bounds.height) return 1;
  return Math.min(maxW / bounds.width, maxH / bounds.height);
};

export const getDisplaySize = furniture => {
  if (furniture.rotation === 90) {
    return { w: furniture.height, h: furniture.width };
  }
  return { w: furniture.width, h: furniture.height };
};
