import { useCallback, useRef, useState } from "react";

const isDisplayMediaSupported = () =>
  typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;

const stopStream = (stream: MediaStream) => {
  stream.getTracks().forEach((track) => track.stop());
  // Sharing a different window/tab moves the browser's focus there; bring
  // it back to this tab once capture ends, so the user isn't left looking
  // at whatever they were recording instead of the contact form.
  window.focus();
};

// Grabs one frame from a live video track and encodes it as a PNG File.
const grabFrame = (stream: MediaStream): Promise<File> =>
  new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;

    video.onloadedmetadata = () => {
      video.play().then(() => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("לא ניתן ליצור canvas לצילום המסך"));
          return;
        }
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("נכשלה יצירת קובץ הצילום"));
            return;
          }
          resolve(new File([blob], `screenshot-${Date.now()}.png`, { type: "image/png" }));
        }, "image/png");
      }, reject);
    };
  });

export function useScreenCapture(onRecordingStop: (file: File | null) => void) {
  const isSupported = isDisplayMediaSupported();
  const [isRecording, setIsRecording] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Always points at the latest callback, so onstop below (set up once per
  // recording session) never calls a stale closure from an earlier render.
  const onRecordingStopRef = useRef(onRecordingStop);
  onRecordingStopRef.current = onRecordingStop;

  const captureScreenshot = useCallback(async (): Promise<File | null> => {
    if (!isSupported) return null;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      try {
        return await grabFrame(stream);
      } finally {
        stopStream(stream);
      }
    } catch (err) {
      // The user cancelling the browser's picker (NotAllowedError) is a
      // normal outcome here, not a failure worth surfacing as an error.
      if (err instanceof Error && err.name === "NotAllowedError") return null;
      throw err;
    }
  }, [isSupported]);

  const startRecording = useCallback(async (): Promise<boolean> => {
    if (!isSupported || isRecording) return false;
    try {
      // audio: true is only a hint - the browser shows a "share audio"
      // checkbox in its picker (support and exact scope, tab vs. system,
      // vary by browser/OS), and the user can leave it unchecked. Either
      // way MediaRecorder just uses whatever tracks the stream ends up with.
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      // This fires no matter how the recording stopped - our "stop
      // recording" button (below) or the browser's own "stop sharing"
      // control - so the captured file is never silently dropped.
      recorder.onstop = () => {
        const hasData = chunksRef.current.some((chunk) => chunk.size > 0);
        const file = hasData
          ? new File(chunksRef.current, `recording-${Date.now()}.webm`, { type: "video/webm" })
          : null;
        if (!hasData) {
          console.error("Screen recording produced no data (0 chunks captured).");
        }
        chunksRef.current = [];
        if (streamRef.current) stopStream(streamRef.current);
        streamRef.current = null;
        setIsRecording(false);
        onRecordingStopRef.current(file);
      };

      // If the user stops sharing from the browser's own UI (rather than
      // our "stop recording" button), treat it the same as pressing stop.
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
      });

      recorderRef.current = recorder;
      // A timeslice makes the recorder flush a chunk every second instead
      // of buffering the whole recording and delivering it in one shot at
      // stop() time. Without it, sharing a DIFFERENT browser tab and then
      // switching focus to that tab pushes this tab into the background;
      // Chromium throttles/deprioritizes background tabs, and the single
      // final dataavailable+stop pair can be delayed or dropped entirely,
      // silently losing the whole recording. Periodic chunks land as they
      // come in regardless, so at worst only the last ~1s is at risk.
      recorder.start(1000);
      setIsRecording(true);
      return true;
    } catch (err) {
      if (err instanceof Error && err.name === "NotAllowedError") return false;
      throw err;
    }
  }, [isSupported, isRecording]);

  // Just triggers the stop - the resulting file always arrives via
  // onRecordingStop (passed into the hook), not via this function's
  // return value, since a recording can also end from the browser's own
  // "stop sharing" control without this ever being called.
  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }, []);

  return { isSupported, isRecording, captureScreenshot, startRecording, stopRecording };
}
