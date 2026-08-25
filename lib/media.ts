import { File, Paths } from 'expo-file-system';

// Permanent storage for a day's photos and voice notes.
//
// Nothing a day record points at survives on its own:
//   • camera captures and expo-av recordings land in the CACHE directory,
//     which iOS reclaims under storage pressure
//   • a picked photo's `localUri` is a reference into the user's photo library
//     that breaks the moment they delete the original
//
// So anything a record refers to has to be OUR copy, in the document
// directory, under a name we can predict from the date key.

// ---------------------------------------------------------------------------
// FILE NAMES
// ---------------------------------------------------------------------------
// Deriving the name from the date key means one day's media always occupies the
// same handful of paths — re-saving overwrites in place instead of accumulating
// a new file per edit.

export const captureFileName = (slot: 'main' | 'selfie', dateKey: string) =>
  `capture_${slot}_${dateKey}.jpg`;

export const voiceNoteFileName = (dateKey: string) => `voice_${dateKey}.m4a`;

// ---------------------------------------------------------------------------
// COPY / DELETE
// ---------------------------------------------------------------------------

/**
 * Copy a file into permanent app storage and return its new path.
 *
 * Returns `null` if the copy fails. Callers MUST treat that as "there is no
 * file" and store an empty value — storing the source path instead would leave
 * the record pointing at something that can disappear.
 */
export const persistFile = (sourceUri: string, filename: string): string | null => {
  try {
    const destination = new File(Paths.document, filename);
    // re-saving an already-persisted file: nothing to do, and deleting the
    // destination first would destroy the source
    if (sourceUri === destination.uri) return sourceUri;
    if (destination.exists) destination.delete(); // overwrite an earlier save
    new File(sourceUri).copy(destination);
    return destination.uri;
  } catch (e) {
    console.warn(`Could not copy ${filename} into permanent storage`, e);
    return null;
  }
};

/** Remove a file if it's there. Missing is not an error — it's the goal. */
export const deleteFileIfPresent = (uri: string | null | undefined) => {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (e) {
    console.warn('Could not delete a file from permanent storage', e);
  }
};

/** The path a given filename would occupy, whether or not it exists yet. */
export const documentPath = (filename: string) => new File(Paths.document, filename).uri;
