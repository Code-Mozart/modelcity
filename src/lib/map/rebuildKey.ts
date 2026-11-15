/** `Ctrl+Comma`: throw the segment index of the open project away and build it again (^1248). A hidden control, with no hint; `Ctrl` only, as `Cmd+Comma` is the settings of the browser on a Mac. */
export const isRebuildKey = (e: {
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}) => e.key === ',' && e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey;
