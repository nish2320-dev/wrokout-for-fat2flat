import { Directory, File, Paths } from 'expo-file-system';

/**
 * Progress photos live in a folder inside the app's documents directory and
 * never leave the phone. Check-ins store only the file name: iOS moves the
 * app's container between versions, so the full path is rebuilt on use.
 */

const folder = () => new Directory(Paths.document, 'progress-photos');

/** Copies a picked or captured image into the app and returns its file name. */
export async function savePhoto(sourceUri: string, pose: 'front' | 'side'): Promise<string> {
  const dir = folder();
  dir.create({ idempotent: true, intermediates: true });
  const name = `${pose}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.jpg`;
  await new File(sourceUri).copy(new File(dir, name));
  return name;
}

export const photoUri = (name: string) => new File(folder(), name).uri;

export function deletePhotos(names: (string | undefined)[]) {
  for (const name of names) {
    if (!name) continue;
    try {
      const f = new File(folder(), name);
      if (f.exists) f.delete();
    } catch {
      // a photo that's already gone is fine
    }
  }
}

export function deleteAllPhotos() {
  try {
    const dir = folder();
    if (dir.exists) dir.delete();
  } catch {
    // nothing to delete
  }
}
