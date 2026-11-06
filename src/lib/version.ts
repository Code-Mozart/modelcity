import { moniker, version } from '../../package.json';

/** The version and the moniker (the name of the PR) come from `package.json`, the one source of truth (^367). */
export const VERSION = `v${version}`;
export const MONIKER: string = moniker;

/** What names the build: `v0.34.0: Version display and favicon`. */
export const VERSION_TEXT = `${VERSION}: ${MONIKER}`;

/** The title of the browser tab (^788). */
export const TAB_TITLE = `modelcity ${VERSION}`;
