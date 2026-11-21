/** `Ctrl+Period`: the frame times on and off (^1252). A hidden control, with no hint; `Ctrl` only, as with `Ctrl+Comma` (^1248). */
export const isFramesKey = (e: {
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}) => e.key === '.' && e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey;
