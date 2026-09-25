// Single source of truth for the streams row height, shared by the loading
// skeleton and the resolved row so they can never drift and cause layout shift.
export const STREAM_ROW_HEIGHT_PX = 64; // adjust to match the real row's actual height
export const STREAM_ROW_CLASSNAME = "h-16 py-4 px-4"; // adjust to match the real row's classes