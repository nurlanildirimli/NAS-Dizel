-- Local voice-note draft key. This stores no audio; recordings stay on-device only.

alter table public.service_drafts
  add column if not exists local_recording_key text;
