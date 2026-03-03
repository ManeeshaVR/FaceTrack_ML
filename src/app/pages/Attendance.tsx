import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertCircle, CheckCircle2, XCircle, RefreshCw,
  Loader2, ShieldX, ShieldAlert, Play, Square, Clock
} from 'lucide-react';

import { StudentAvatar } from '../components/StudentAvatar';
import { classScheduleApi, faceApi, attendanceApi } from '../data/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CheckResult {
  access: 'granted' | 'denied' | 'already_marked';
  reason: 'not_enrolled' | 'payment_overdue' | 'payment_pending_early' | 'paid' | 'already_marked';
  student?: { id: string; name: string; grade: number; gender: string };
  class?: { name: string; grade: number };
  enrollment?: { status: string };
  payment?: { status: string; month: string; amount?: number };
  ids?: { studentMongoId: string; classMongoId: string; classScheduleMongoId: string };
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function captureFrame(videoEl: HTMLVideoElement, canvasEl: HTMLCanvasElement): string | null {
  canvasEl.width = videoEl.videoWidth;
  canvasEl.height = videoEl.videoHeight;
  const ctx = canvasEl.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(videoEl, 0, 0);
  return canvasEl.toDataURL('image/jpeg', 0.85);
}

const FIRST_SCAN_DELAY_MS = 10_000;  // 10 s before the first scan
const SCAN_INTERVAL_MS = 20_000;  // 20 s between subsequent scans

// ─── Component ────────────────────────────────────────────────────────────────
export default function Attendance() {
  // data
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [dataLoading, setDataLoading] = useState(true);

  // session
  const [isActive, setIsActive] = useState(false);
  const [livenessEnabled, setLivenessEnabled] = useState(false);

  // camera
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);

  // recognition / result
  const [scanState, setScanState] = useState<
    'idle' | 'liveness' | 'recognizing' | 'checking' | 'saving' |
    'done_granted' | 'done_denied' | 'done_already' | 'unknown' | 'spoof' | 'error'
  >('idle');

  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch class schedules ───────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await classScheduleApi.getAll();
        if (res.data.success) setClasses(res.data.data);
      } catch { }
      finally { setDataLoading(false); }
    })();
    return () => stopCamera();
  }, []);

  // ── Camera ──────────────────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      setPermissionDenied(false);
      setCameraError('');
      const ms = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 },
      });
      setStream(ms);
      if (videoRef.current) videoRef.current.srcObject = ms;
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access denied. Please allow camera permissions.');
        setPermissionDenied(true);
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Unable to access camera.');
      }
    }
  };

  const stopCamera = () => {
    setStream(prev => {
      if (prev) prev.getTracks().forEach(t => t.stop());
      return null;
    });
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  // ── Core scan ───────────────────────────────────────────────────────────────
  const runScan = useCallback(async () => {
    if (!selectedClass || !videoRef.current || !canvasRef.current) return;

    const frame = captureFrame(videoRef.current, canvasRef.current);
    if (!frame) return;

    const token = localStorage.getItem('token') || '';

    setScanState('liveness' as any);
    setCheckResult(null);
    setErrorMsg('');

    // Step 0 — liveness check (only when toggle is on)
    if (livenessEnabled) {
      try {
        const lvRes = await faceApi.liveness(frame);
        if (!lvRes.data.is_live) {
          setScanState('spoof' as any);
          return;
        }
        // is_live === true → proceed
      } catch {
        setScanState('error');
        setErrorMsg('Could not reach ML backend for liveness check.');
        return;
      }
    }

    // Step 1 — identify face
    setScanState('recognizing');

    let studentMongoId: string | null = null;
    try {
      const recRes = await faceApi.recognize(frame, token);
      if (!recRes.data.identified) { setScanState('unknown'); return; }
      studentMongoId = recRes.data.student_id;
    } catch {
      setScanState('error');
      setErrorMsg('Could not reach ML backend (port 8000). Is the Python server running?');
      return;
    }

    if (!studentMongoId) { setScanState('unknown'); return; }

    // Step 2 — enrollment + payment check
    setScanState('checking');
    let result: CheckResult;
    try {
      const checkRes = await attendanceApi.check(studentMongoId, selectedClass);
      result = checkRes.data.data;
      setCheckResult(result);
    } catch (err: any) {
      setScanState('error');
      setErrorMsg(err.response?.data?.error || 'Attendance check failed.');
      return;
    }

    // Step 3 — save if granted
    if (result.access === 'granted' && result.ids) {
      setScanState('saving');
      try {
        await attendanceApi.mark(
          result.ids.studentMongoId,
          result.ids.classMongoId,
          result.ids.classScheduleMongoId,
        );
        setScanState('done_granted');
      } catch (err: any) {
        // If the backend says already marked, treat it as already_marked
        const msg: string = err.response?.data?.error || '';
        if (msg.toLowerCase().includes('already')) {
          setScanState('done_already');
        } else {
          setScanState('error');
          setErrorMsg(`Mark failed: ${msg || 'Could not save attendance record.'}`);
        }
      }
    } else if (result.access === 'already_marked') {
      setScanState('done_already');
    } else {
      setScanState('done_denied');
    }
  }, [selectedClass, livenessEnabled]);

  // ── Start / Stop session ────────────────────────────────────────────────────
  const startSession = async () => {
    if (!selectedClass) return;
    await startCamera();
    setIsActive(true);
    setScanState('idle');
    setCheckResult(null);
    setCountdown(FIRST_SCAN_DELAY_MS / 1000);
  };

  const stopSession = () => {
    stopCamera();
    setIsActive(false);
    setScanState('idle');
    setCheckResult(null);
    setErrorMsg('');
    setCountdown(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    intervalRef.current = null;
    countdownRef.current = null;
  };

  // ── Scan loop ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive || !selectedClass) return;

    setCountdown(FIRST_SCAN_DELAY_MS / 1000);

    const firstTimer = setTimeout(() => {
      runScan();
      setCountdown(SCAN_INTERVAL_MS / 1000);
      intervalRef.current = setInterval(() => {
        runScan();
        setCountdown(SCAN_INTERVAL_MS / 1000);
      }, SCAN_INTERVAL_MS);
    }, FIRST_SCAN_DELAY_MS);

    return () => {
      clearTimeout(firstTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, selectedClass, runScan]);

  // ── Countdown ticker ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive) return;
    countdownRef.current = setInterval(() => {
      setCountdown(c => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [isActive]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const isProcessing = ['liveness', 'recognizing', 'checking', 'saving'].includes(scanState);
  const scanLabel =
    scanState === 'liveness' ? 'Liveness check…' :
      scanState === 'recognizing' ? 'Identifying face…' :
        scanState === 'checking' ? 'Checking enrollment…' :
          scanState === 'saving' ? 'Saving record…' : '';


  const isFirstScan = isActive && countdown > SCAN_INTERVAL_MS / 1000;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Attendance</h2>
        <p className="text-gray-600 mt-1">Monitor student attendance with facial recognition</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Class Schedule</label>
            <select
              value={selectedClass}
              onChange={(e) => { if (isActive) stopSession(); setSelectedClass(e.target.value); }}
              disabled={dataLoading || isActive}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">{dataLoading ? 'Loading schedules…' : 'Choose a class…'}</option>
              {classes.map(cls => (
                <option key={cls._id} value={cls._id}>
                  {`${cls.classId?.subjectId?.subjectName} G${cls.classId?.grade} - ${cls.startTime} (${cls.day})`}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 pb-1">
            <span className="text-sm font-medium text-gray-700">Liveness</span>
            <button
              onClick={() => setLivenessEnabled(!livenessEnabled)}
              className={`relative w-14 h-8 rounded-full transition-colors ${livenessEnabled ? 'bg-gradient-to-r from-purple-600 to-blue-600' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${livenessEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="pb-1">
            {!isActive ? (
              <button
                onClick={startSession}
                disabled={!selectedClass || dataLoading}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
              >
                <Play className="w-5 h-5" /> Start Marking Attendance
              </button>
            ) : (
              <button
                onClick={stopSession}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                <Square className="w-5 h-5" /> Stop Marking Attendance
              </button>
            )}
          </div>
        </div>

        {/* Status bar */}
        {isActive && !isProcessing && (
          <div className="mt-4 flex items-center gap-2 text-sm text-purple-700 bg-purple-50 border border-purple-200 rounded-xl px-4 py-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            <span>
              Marking active —{' '}
              {isFirstScan
                ? <>first scan in <strong>{countdown}s</strong></>
                : <>next scan in <strong>{countdown}s</strong></>}
            </span>
          </div>
        )}
      </div>

      {/* Camera + Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Camera */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Live Camera Feed</h3>
              {isActive && (
                <span className="flex items-center gap-2 text-sm text-purple-100">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> LIVE
                </span>
              )}
            </div>

            <div className="relative bg-gray-900 aspect-video">

              {/* Idle placeholder */}
              {!isActive && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-4">
                    <Play className="w-10 h-10 text-white/60" />
                  </div>
                  <p className="text-lg font-medium text-white/70">
                    {selectedClass ? 'Click "Start Marking Attendance" to begin' : 'Select a class schedule first'}
                  </p>
                </div>
              )}

              {/* Camera error */}
              {isActive && cameraError && (
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <div className="text-center text-white max-w-md">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
                    <p className="text-lg font-semibold mb-2">{cameraError}</p>
                    {permissionDenied && (
                      <div className="mt-4 text-sm text-gray-300 text-left bg-gray-800 rounded-lg p-4 space-y-1">
                        <p className="font-semibold">To enable camera:</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Click the camera icon in the address bar</li>
                          <li>Select "Allow"</li>
                          <li>Click "Retry" below</li>
                        </ol>
                      </div>
                    )}
                    <button onClick={startCamera}
                      className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 mx-auto">
                      <RefreshCw className="w-4 h-4" /> Retry Camera
                    </button>
                  </div>
                </div>
              )}

              {/* Video */}
              <video
                ref={videoRef}
                autoPlay playsInline muted
                className={`w-full h-full object-cover ${!isActive || cameraError ? 'hidden' : ''}`}
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* ── Face guide box ── */}
              {isActive && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {/* Dimmed surround */}
                  <div className="absolute inset-0 bg-black/30" style={{ maskImage: 'radial-gradient(ellipse 38% 50% at 50% 45%, transparent 100%, black 100%)' }} />

                  {/* Bright guide rectangle */}
                  <div
                    className={`relative border-2 rounded-2xl transition-colors duration-300 ${isProcessing
                      ? 'border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.6)]'
                      : scanState === 'done_granted'
                        ? 'border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.6)]'
                        : scanState === 'done_denied' || scanState === 'unknown'
                          ? 'border-red-400 shadow-[0_0_20px_rgba(248,113,113,0.5)]'
                          : 'border-white/70'
                      }`}
                    style={{ width: '38%', paddingTop: '50%' }}
                  >
                    {/* Corner accents */}
                    {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                      <div
                        key={i}
                        className={`absolute w-5 h-5 border-white/90 ${pos} ${i === 0 ? 'border-t-2 border-l-2 rounded-tl-lg' :
                          i === 1 ? 'border-t-2 border-r-2 rounded-tr-lg' :
                            i === 2 ? 'border-b-2 border-l-2 rounded-bl-lg' :
                              'border-b-2 border-r-2 rounded-br-lg'
                          }`}
                      />
                    ))}
                  </div>

                  {/* Label below box */}
                  <div className="absolute" style={{ top: '82%', left: '50%', transform: 'translateX(-50%)' }}>
                    <span className="bg-black/60 text-white/90 text-xs px-3 py-1 rounded-full whitespace-nowrap">
                      {isProcessing ? scanLabel : 'Position your face within the box'}
                    </span>
                  </div>
                </div>
              )}

              {/* Processing overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-purple-500/10 flex items-center justify-center">
                  <div className="bg-white/90 rounded-2xl px-6 py-4 flex items-center gap-3 shadow-lg">
                    <Loader2 className="w-5 h-5 text-purple-700 animate-spin" />
                    <p className="text-purple-900 font-medium">{scanLabel}</p>
                  </div>
                </div>
              )}

              {/* Liveness badge */}
              {isActive && livenessEnabled && !cameraError && (
                <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" /> Liveness Active
                </div>
              )}

              {/* Countdown chip */}
              {isActive && !isProcessing && !cameraError && (
                <div className="absolute bottom-4 right-4 bg-black/50 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  {isFirstScan ? 'First scan' : 'Next scan'}: {countdown}s
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Result panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden h-full">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-3">
              <h3 className="text-base font-semibold text-white">Recognition</h3>
            </div>
            <div className="p-4">

              {!isActive && (
                <div className="text-center py-10">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                    <Play className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">Start a marking session<br />to see results here</p>
                </div>
              )}

              {isActive && scanState === 'idle' && (
                <div className="text-center py-10">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-purple-50 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                  </div>
                  <p className="text-sm text-purple-600 font-medium">Waiting for first scan…</p>
                </div>
              )}

              {isProcessing && (
                <div className="text-center py-10">
                  <Loader2 className="w-10 h-10 mx-auto text-purple-500 animate-spin mb-3" />
                  <p className="text-sm text-gray-600">{scanLabel}</p>
                </div>
              )}

              {isActive && scanState === 'unknown' && (

                <div className="space-y-3">
                  <div className="flex justify-center">
                    <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                      <ShieldX className="w-10 h-10 text-gray-500" />
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-center">
                    <p className="text-sm font-bold text-gray-800">Unknown Student</p>
                    <p className="text-xs text-gray-500 mt-1">Face not recognised in database</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-3 text-center">
                    <XCircle className="w-8 h-8 mx-auto mb-1 text-red-600" />
                    <p className="text-sm font-bold text-red-800">ACCESS DENIED</p>
                  </div>
                </div>
              )}

              {/* Spoofing detected */}
              {isActive && scanState === 'spoof' && (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center">
                      <ShieldAlert className="w-10 h-10 text-orange-500" />
                    </div>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-center">
                    <p className="text-sm font-bold text-orange-800">Spoofing Detected</p>
                    <p className="text-xs text-orange-600 mt-1">Photo or screen attack detected</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-3 text-center">
                    <XCircle className="w-8 h-8 mx-auto mb-1 text-red-600" />
                    <p className="text-sm font-bold text-red-800">ACCESS DENIED</p>
                    <p className="text-xs text-red-500 mt-0.5">Liveness check failed</p>
                  </div>
                </div>
              )}


              {isActive && scanState === 'error' && (
                <div className="space-y-2 text-center py-6">
                  <AlertCircle className="w-10 h-10 mx-auto text-orange-400" />
                  <p className="text-xs text-orange-600 font-medium">{errorMsg}</p>
                </div>
              )}

              {checkResult && (scanState === 'done_granted' || scanState === 'done_denied' || scanState === 'done_already') && (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <StudentAvatar gender={(checkResult.student?.gender as 'male' | 'female') ?? 'male'} size="lg" />
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <p className="text-xs text-green-700 font-medium">Student Identified</p>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-400">Student ID</p>
                      <p className="text-sm font-bold text-gray-900">{checkResult.student?.id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Name</p>
                      <p className="text-sm font-bold text-gray-900">{checkResult.student?.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Grade</p>
                      <p className="text-sm font-medium text-gray-900">Grade {checkResult.student?.grade}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 mb-1">Class Enrollment</p>
                    {checkResult.enrollment ? (
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-lg">✓ Enrolled</span>
                    ) : (
                      <span className="inline-block bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-lg">✗ Not Enrolled</span>
                    )}
                  </div>

                  {checkResult.payment && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1 capitalize">Payment — {checkResult.payment.month}</p>
                      {checkResult.payment.status === 'paid' && <span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded-lg">PAID</span>}
                      {checkResult.payment.status === 'pending' && <span className="inline-block bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-0.5 rounded-lg">PENDING</span>}
                      {checkResult.payment.status === 'overdue' && <span className="inline-block bg-red-100 text-red-800 text-xs font-semibold px-2 py-0.5 rounded-lg">OVERDUE</span>}
                    </div>
                  )}

                  {checkResult.reason === 'not_enrolled' && <p className="text-xs text-red-500 font-medium">Student is not enrolled in this class.</p>}
                  {checkResult.reason === 'payment_overdue' && <p className="text-xs text-red-500 font-medium">Payment overdue — past the 15th of the month.</p>}
                  {checkResult.reason === 'payment_pending_early' && <p className="text-xs text-yellow-600 font-medium">Payment pending — grace period (before 15th).</p>}

                  {scanState === 'done_granted' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-3 text-center">
                      <CheckCircle2 className="w-7 h-7 mx-auto mb-1 text-green-600" />
                      <p className="text-sm font-bold text-green-800">ACCESS GRANTED</p>
                      <p className="text-xs text-green-600 mt-0.5">Attendance saved ✓</p>
                    </div>
                  )}
                  {scanState === 'done_denied' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-3 text-center">
                      <XCircle className="w-7 h-7 mx-auto mb-1 text-red-600" />
                      <p className="text-sm font-bold text-red-800">ACCESS DENIED</p>
                    </div>
                  )}
                  {scanState === 'done_already' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-3 text-center">
                      <CheckCircle2 className="w-7 h-7 mx-auto mb-1 text-blue-600" />
                      <p className="text-sm font-bold text-blue-800">ALREADY MARKED</p>
                      <p className="text-xs text-blue-600 mt-0.5">Attendance recorded today</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}