import { CONFIG } from "../config.js";

export const getScale = room =>
  Math.min(CONFIG.maxW / room.width, CONFIG.maxH / room.height);

export const getDisplaySize = furniture => {
  if (furniture.rotation === 90) {
    return { w: furniture.height, h: furniture.width };
  }
  return { w: furniture.width, h: furniture.height };
};
