import { useState, useEffect, useRef } from 'react';
import { X, Camera, CheckCircle2, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { faceApi } from '../data/api';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  studentId: string;
  studentMongoId: string;
}

type CaptureStatus = 'idle' | 'capturing' | 'processing' | 'saving' | 'done' | 'error';

export function CameraModal({ isOpen, onClose, studentName, studentId, studentMongoId }: CameraModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Capture flow
  const [captureStatus, setCaptureStatus] = useState<CaptureStatus>('idle');
  const [capturedImages, setCapturedImages] = useState<string[]>([]);   // base64 data-urls
  const [embeddings, setEmbeddings] = useState<number[][]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [flashActive, setFlashActive] = useState(false);

  const REQUIRED_CAPTURES = 5; // how many shots to take

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── camera lifecycle ──────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      startCamera();
      resetState();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const resetState = () => {
    setCaptureStatus('idle');
    setCapturedImages([]);
    setEmbeddings([]);
    setStatusMessage('');
    setCameraError('');
    setPermissionDenied(false);
  };

  const startCamera = async () => {
    try {
      setPermissionDenied(false);
      setCameraError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access denied. Please allow camera permissions.');
        setPermissionDenied(true);
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found. Please connect a camera and try again.');
      } else {
        setCameraError('Unable to access camera.');
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setStream(null);
  };

  // ── capture a single frame as base64 ─────────────────────────────
  const captureFrame = (): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  // ── main capture-and-embed flow ───────────────────────────────────
  const handleCapture = async () => {
    if (!stream || captureStatus !== 'idle') return;

    setCaptureStatus('capturing');
    const collectedEmbeddings: number[][] = [];
    const collectedImages: string[] = [];

    for (let i = 0; i < REQUIRED_CAPTURES; i++) {
      // flash feedback
      setFlashActive(true);
      setTimeout(() => setFlashActive(false), 150);
      setStatusMessage(`Capturing photo ${i + 1} of ${REQUIRED_CAPTURES}…`);

      const frame = captureFrame();
      if (!frame) {
        setCaptureStatus('error');
        setStatusMessage('Failed to capture frame from camera.');
        return;
      }

      collectedImages.push(frame);

      // slight delay between shots for natural feel
      await new Promise(r => setTimeout(r, 600));

      // get embedding from ML backend
      setCaptureStatus('processing');
      setStatusMessage(`Processing photo ${i + 1} of ${REQUIRED_CAPTURES}…`);

      try {
        const res = await faceApi.embed(frame);
        collectedEmbeddings.push(res.data.embedding);
      } catch {
        setCaptureStatus('error');
        setStatusMessage('Could not reach ML backend. Is Python server running on port 8000?');
        return;
      }

      setCaptureStatus('capturing');
    }

    setCapturedImages(collectedImages);
    setEmbeddings(collectedEmbeddings);

    // save all embeddings to Node backend
    setCaptureStatus('saving');
    setStatusMessage('Saving face data to database…');

    try {
      await faceApi.saveEmbeddings(studentMongoId, collectedEmbeddings);
      setCaptureStatus('done');
      setStatusMessage('Face data saved successfully!');
      // auto-close after 2 s
      setTimeout(() => onClose(), 2000);
    } catch (err: any) {
      setCaptureStatus('error');
      const msg = err.response?.data?.error || 'Failed to save embeddings to backend.';
      setStatusMessage(msg);
    }
  };

  if (!isOpen) return null;

  const isProcessing = captureStatus === 'capturing' || captureStatus === 'processing' || captureStatus === 'saving';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Record Face Data</h2>
            <p className="text-purple-100 text-sm">{studentName} ({studentId})</p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors disabled:opacity-40"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Camera View */}
          <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video">
            {cameraError ? (
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <div className="text-center text-white max-w-md">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
                  <p className="text-lg font-semibold mb-2">{cameraError}</p>
                  {permissionDenied && (
                    <div className="mt-4 text-sm text-gray-300 text-left bg-gray-800 rounded-lg p-4 space-y-1">
                      <p className="font-semibold">To enable camera access:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Click the camera icon in your browser's address bar</li>
                        <li>Select "Allow" for camera permissions</li>
                        <li>Click "Retry" below</li>
                      </ol>
                    </div>
                  )}
                  <button
                    onClick={startCamera}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 mx-auto"
                  >
                    <RefreshCw className="w-4 h-4" /> Retry
                  </button>
                </div>
              </div>
            ) : (
              <>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />

                {/* Flash overlay */}
                {flashActive && <div className="absolute inset-0 bg-white/50 pointer-events-none" />}

                {/* Face guide oval */}
                {captureStatus === 'idle' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="border-4 border-white/60 rounded-full w-48 h-64 opacity-70" />
                  </div>
                )}

                {/* Success overlay */}
                {captureStatus === 'done' && (
                  <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                    <div className="bg-white rounded-full p-4 shadow-lg">
                      <CheckCircle2 className="w-16 h-16 text-green-600" />
                    </div>
                  </div>
                )}

                {/* Error overlay */}
                {captureStatus === 'error' && (
                  <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                    <div className="bg-white rounded-full p-4 shadow-lg">
                      <AlertCircle className="w-16 h-16 text-red-500" />
                    </div>
                  </div>
                )}
              </>
            )}

            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Progress dots */}
          {(captureStatus === 'capturing' || captureStatus === 'processing' || captureStatus === 'done') && (
            <div className="flex justify-center gap-3 mt-4">
              {Array.from({ length: REQUIRED_CAPTURES }).map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-all ${i < embeddings.length
                    ? 'bg-green-500 scale-110'
                    : i === embeddings.length && isProcessing
                      ? 'bg-purple-500 animate-pulse'
                      : 'bg-gray-300'
                    }`}
                />
              ))}
            </div>
          )}

          {/* Status message */}
          {statusMessage && (
            <div
              className={`mt-4 px-4 py-3 rounded-xl text-sm font-medium text-center ${captureStatus === 'done'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : captureStatus === 'error'
                  ? 'bg-red-50 border border-red-200 text-red-700'
                  : 'bg-purple-50 border border-purple-200 text-purple-700'
                }`}
            >
              {isProcessing && <Loader2 className="w-4 h-4 inline-block animate-spin mr-2" />}
              {statusMessage}
            </div>
          )}

          {/* Instructions when idle */}
          {!cameraError && captureStatus === 'idle' && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Instructions:</strong> Centre your face in the oval guide. We'll automatically take{' '}
                <strong>{REQUIRED_CAPTURES} photos</strong> to register your face.
              </p>
            </div>
          )}

          {/* Capture / Retry buttons */}
          {!cameraError && (
            <div className="mt-6 flex justify-center gap-4">
              {captureStatus === 'idle' && (
                <button
                  onClick={handleCapture}
                  disabled={!stream}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  Start Capture ({REQUIRED_CAPTURES} photos)
                </button>
              )}

              {captureStatus === 'error' && (
                <button
                  onClick={resetState}
                  className="bg-purple-600 text-white px-8 py-3 rounded-xl font-medium hover:shadow-lg flex items-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  Try Again
                </button>
              )}

              {isProcessing && (
                <button
                  disabled
                  className="bg-gray-200 text-gray-500 px-8 py-3 rounded-xl font-medium flex items-center gap-2 cursor-not-allowed"
                >
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing…
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}