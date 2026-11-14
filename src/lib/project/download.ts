/** The name of the export file of a project: its title with anything but letters and digits made into dashes. */
export const exportName = (title: string) =>
  `${
    title
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-|-$/g, '') || 'project'
  }.modelcity.json`;

/** Give the browser a text to save as a file. */
export function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  URL.revokeObjectURL(url);
}
