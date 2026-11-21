import { convertedText, isOlder, ProjectFileError, type ProjectFile } from './file';
import { migrate, readProject, validateHeader } from './migrate';
import { headerOf, type Header, type ProjectStorage } from './storage';

/** What opening a stored project found: its header, and the text for the user if it was converted to the current data model. */
export interface Opened {
  header: Header;
  converted: string | null;
}

/**
 * Open a stored project without reading its map (^1236). A project of the current data model is
 * only its header, checked. One of an older model is migrated first, and that is the one time the
 * whole project is in memory: read, migrated, checked like an import (^229), written back in the
 * new version, and let go. Nothing is read from the map until this is done.
 */
export async function openStored(storage: ProjectStorage, id: string): Promise<Opened> {
  const stored = await storage.header(id);
  if (!stored)
    throw new ProjectFileError('unreadable', '^208', 'the project is not in the storage');
  if (!isOlder(stored)) return { header: validateHeader(migrate(stored)), converted: null };
  const file: ProjectFile = readProject(await storage.load(id));
  await storage.put({ id, file });
  return { header: headerOf(file), converted: convertedText(file.title) };
}
