import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';

import { type VoiceRecordingDraft } from '../types/voiceRecordings';

const LOCAL_RECORDINGS_KEY = 'nas_dizel_voice_recordings';

function createRecordingId() {
  return `rec-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function loadAllVoiceRecordings(): Promise<VoiceRecordingDraft[]> {
  const raw = await AsyncStorage.getItem(LOCAL_RECORDINGS_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as VoiceRecordingDraft[];
  } catch {
    return [];
  }
}

async function writeAllVoiceRecordings(recordings: VoiceRecordingDraft[]) {
  await AsyncStorage.setItem(LOCAL_RECORDINGS_KEY, JSON.stringify(recordings));
}

async function deleteFileIfExists(uri: string) {
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Local cleanup is best-effort. Metadata cleanup still proceeds.
  }
}

export async function listVoiceRecordings(localRecordingKey: string): Promise<VoiceRecordingDraft[]> {
  const recordings = await loadAllVoiceRecordings();
  return recordings
    .filter((recording) => recording.localRecordingKey === localRecordingKey)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function addVoiceRecording(input: {
  localRecordingKey: string;
  uri: string;
  durationMs: number;
}): Promise<VoiceRecordingDraft> {
  const recording: VoiceRecordingDraft = {
    id: createRecordingId(),
    localRecordingKey: input.localRecordingKey,
    uri: input.uri,
    durationMs: input.durationMs,
    transcript: '',
    warnings: [],
    status: 'recorded',
    createdAt: new Date().toISOString(),
  };

  const recordings = await loadAllVoiceRecordings();
  await writeAllVoiceRecordings([recording, ...recordings]);
  return recording;
}

export async function updateVoiceRecording(
  id: string,
  patch: Partial<Pick<VoiceRecordingDraft, 'transcript' | 'warnings' | 'status'>>,
): Promise<VoiceRecordingDraft | null> {
  const recordings = await loadAllVoiceRecordings();
  let updated: VoiceRecordingDraft | null = null;
  const nextRecordings = recordings.map((recording) => {
    if (recording.id !== id) {
      return recording;
    }

    updated = { ...recording, ...patch };
    return updated;
  });

  await writeAllVoiceRecordings(nextRecordings);
  return updated;
}

export async function deleteVoiceRecording(id: string) {
  const recordings = await loadAllVoiceRecordings();
  const recording = recordings.find((item) => item.id === id);

  if (recording) {
    await deleteFileIfExists(recording.uri);
  }

  await writeAllVoiceRecordings(recordings.filter((item) => item.id !== id));
}

export async function deleteVoiceRecordingsForKey(localRecordingKey: string) {
  const recordings = await loadAllVoiceRecordings();
  const toDelete = recordings.filter((item) => item.localRecordingKey === localRecordingKey);

  await Promise.all(toDelete.map((recording) => deleteFileIfExists(recording.uri)));
  await writeAllVoiceRecordings(recordings.filter((item) => item.localRecordingKey !== localRecordingKey));
}
