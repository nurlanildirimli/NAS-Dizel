export type VoiceRecordingStatus = 'recorded' | 'transcribing' | 'transcribed' | 'failed';

export type VoiceRecordingDraft = {
  id: string;
  localRecordingKey: string;
  uri: string;
  durationMs: number;
  transcript: string;
  warnings: string[];
  status: VoiceRecordingStatus;
  createdAt: string;
};
