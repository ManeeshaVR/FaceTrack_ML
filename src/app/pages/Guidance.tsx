import {
    Camera, Brain, ShieldCheck, GraduationCap, Users,
    BookOpen, ChevronRight, Zap, AlertCircle, CheckCircle2,
    Eye, ScanFace, TrendingUp, ClipboardList, Lock, Cpu
} from 'lucide-react';

interface Step { title: string; desc: string; }
interface Section {
    id: string;
    icon: React.ReactNode;
    color: string;
    title: string;
    subtitle: string;
    steps?: Step[];
    tips?: string[];
    warnings?: string[];
}

const sections: Section[] = [
    {
        id: 'overview',
        icon: <Brain className="w-6 h-6" />,
        color: 'from-purple-500 to-indigo-600',
        title: 'System Overview',
        subtitle: 'How the AI-powered attendance system works',
        steps: [
            {
                title: 'Three AI Models working together',
                desc: 'The system uses three machine-learning models: a Face Embedding model (FaceNet-style) that encodes faces into 128-d vectors for identity matching, a Liveness Detection model (MobileNetV2 trained on CASIA-FASD) that prevents photo spoofing, and a Score Prediction model (Random Forest) that forecasts O/L results from term marks.',
            },
            {
                title: 'Python ML backend (port 8000)',
                desc: 'All three models run inside a FastAPI server. The frontend sends JPEG frames as Base64 strings to /liveness, /recognize, and /predict endpoints. The ML backend never stores student data - it only reads embeddings from the Node backend for matching.',
            },
            {
                title: 'Node.js + MongoDB backend (port 4000)',
                desc: 'Stores all student records, face embeddings, class schedules, attendance records, and scores. The ML backend queries it (authenticated with the teacher JWT) during recognition to retrieve stored embeddings to compare against.',
            },
        ],
    },
    {
        id: 'face-registration',
        icon: <Camera className="w-6 h-6" />,
        color: 'from-blue-500 to-cyan-600',
        title: "Registering a Student's Face",
        subtitle: 'How to capture and save face embeddings',
        steps: [
            {
                title: 'Open Students page and find the student',
                desc: 'Search by name or ID. Each student card shows whether face data has been captured (green camera icon = registered, grey = not yet).',
            },
            {
                title: 'Click "Record Face" (camera button)',
                desc: "A modal opens with a live camera preview. Position the student's face inside the guide box. The box should be filled naturally, not too close or too far.",
            },
            {
                title: 'Capture multiple angles',
                desc: 'Take at least 5-10 photos covering slight left, right, up, and down head tilts. More diverse angles make recognition more robust under different lighting.',
            },
            {
                title: 'Click "Save Embeddings"',
                desc: 'Each photo is converted to a 128-d embedding vector by the FaceNet model. These vectors are stored in MongoDB. When the student re-registers, old embeddings are replaced with the new ones.',
            },
        ],
        tips: [
            'Ensure good, even lighting. Avoid strong backlighting (e.g. student sitting in front of a window).',
            'Ask the student to remove glasses if they plan to attend without glasses.',
            'Capture at least 10 embeddings for reliable recognition.',
        ],
        warnings: [
            'If recognition keeps failing for a student, delete their embeddings and re-register with better lighting.',
        ],
    },
    {
        id: 'liveness',
        icon: <ShieldCheck className="w-6 h-6" />,
        color: 'from-emerald-500 to-teal-600',
        title: 'Liveness Detection (Anti-Spoofing)',
        subtitle: 'Preventing photos and phone screens from fooling the system',
        steps: [
            {
                title: 'Enable the Liveness toggle on the Attendance page',
                desc: 'The toggle is off by default. When enabled, every scan first sends the captured frame to the /liveness endpoint BEFORE running face recognition.',
            },
            {
                title: 'How it works',
                desc: 'A MobileNetV2 model (trained on CASIA-FASD - a dataset of real vs. spoof faces) classifies the cropped face region as "live" or "spoof". A phone photo typically scores P(live) below 0.40 while a real face scores above 0.60.',
            },
            {
                title: 'Decision threshold',
                desc: 'If P(live) is 0.50 or higher, the frame passes and recognition runs. If P(live) is below 0.50, the scan stops and shows a "Spoof Detected" result card and the student is denied.',
            },
        ],
        tips: [
            'Ask students to look directly at the camera and stay still during the scan window.',
            'Liveness works best under normal room lighting. Very dim conditions may cause false rejections.',
            'The [LIVENESS] log line in the uvicorn terminal shows the exact P(live) score for every scan. Use it to tune the threshold in main.py if needed.',
        ],
        warnings: [
            'If your real face is being rejected, check the NN score in the uvicorn log. If it is consistently below 0.50, lower NN_LIVE_THRESHOLD to 0.40 in main.py.',
            'Liveness detection is NOT 100% foolproof. A high-quality professional mask or 3D model could theoretically pass. Use it as one layer of a multi-factor system.',
        ],
    },
    {
        id: 'attendance',
        icon: <ClipboardList className="w-6 h-6" />,
        color: 'from-amber-500 to-orange-600',
        title: 'Marking Attendance',
        subtitle: 'Step-by-step guide for running an attendance session',
        steps: [
            {
                title: 'Select a Class Schedule',
                desc: 'On the Attendance page choose the class schedule from the dropdown. Each schedule is associated with a specific class. Make sure you select the correct day/time combination.',
            },
            {
                title: 'Click "Start Marking Attendance"',
                desc: 'The camera turns on. A guide box appears in the viewfinder. The first scan runs 10 seconds after starting; subsequent scans run every 20 seconds automatically.',
            },
            {
                title: 'Student stands in front of the camera',
                desc: 'The system runs liveness check (if enabled) then face recognition then enrollment and payment check, and saves the attendance record if all checks pass.',
            },
            {
                title: 'Read the result card',
                desc: 'Access Granted means attendance is saved automatically. Access Denied shows the reason (not enrolled or payment overdue). Already Marked means the student was already recorded today. Spoof Detected means liveness check failed.',
            },
            {
                title: 'Click "Stop Marking Attendance" when done',
                desc: 'Camera shuts off. Attendance records can be reviewed in the Attendance Records table on the same page.',
            },
        ],
        tips: [
            'The 20-second interval gives enough time for one student to step away and the next to step up.',
            'If a student is "Not Enrolled", check their class registration in the admin portal.',
            'Payment "Pending (after 15th)" means it is past mid-month and payment has not been received. Contact the student.',
        ],
    },
    {
        id: 'score-prediction',
        icon: <TrendingUp className="w-6 h-6" />,
        color: 'from-rose-500 to-pink-600',
        title: 'O/L Score Prediction',
        subtitle: 'Using AI to forecast final exam results',
        steps: [
            {
                title: 'Select a Grade 11 student',
                desc: 'Only Grade 11 students appear in the dropdown because O/L predictions are only meaningful at that stage. The model needs marks from Grade 9, 10, and 11.',
            },
            {
                title: 'Click "Predict Scores"',
                desc: 'The system fetches all score records for that student, groups them by subject, and checks whether each subject has exactly 9 marks (3 terms x 3 grades).',
            },
            {
                title: 'Subject cards show results',
                desc: 'Subjects with 9 records show a predicted percentage and grade letter using Sri Lanka O/L boundaries: A for 75 and above, B for 65-74, C for 55-64, S for 35-54, F below 35. Subjects with fewer than 9 marks show "Not enough records".',
            },
            {
                title: 'Use results for academic guidance',
                desc: 'The Random Forest model was trained on the UCI Student Performance dataset (RMSE approximately 2 marks, R-squared approximately 0.99). Use predictions as one data point, not as a definitive outcome.',
            },
        ],
        tips: [
            'Ensure all nine term marks are entered in the admin Score Module before running predictions.',
            'Marks must be entered in order: Grade 9 Term 1, Term 2, Term 3, then Grade 10, then Grade 11.',
            'The performance summary card at the top shows the average predicted score and a grade distribution breakdown.',
        ],
        warnings: [
            'The model was trained on a Portuguese student dataset scaled to 0-100. Predictions are indicative only. Actual O/L results depend on many factors beyond term marks.',
        ],
    },
    {
        id: 'system-requirements',
        icon: <Cpu className="w-6 h-6" />,
        color: 'from-slate-500 to-gray-700',
        title: 'System Requirements',
        subtitle: 'Running the system correctly',
        steps: [
            {
                title: 'Three servers must be running simultaneously',
                desc: '1) Python ML backend: run uvicorn main:app --host 0.0.0.0 --port 8000 --reload inside ml/ml-backend with the venv activated. 2) Node.js backend: run npm run dev inside backend/. 3) React dev server: run npm run dev inside ml/.',
            },
            {
                title: 'Camera permission',
                desc: 'The browser must have permission to access the webcam. On first load, accept the camera permission prompt. If accidentally denied, go to browser Settings, then Site Settings, then Camera, and Allow for localhost.',
            },
            {
                title: 'Model files',
                desc: 'Three model files must be present in ml/ml-backend/models/: face_embedding_model.pt, liveness_model.pt, and ol_prediction_model.pkl. The server will crash at startup if any are missing.',
            },
        ],
        tips: [
            'Use .\\venv\\Scripts\\uvicorn.exe to ensure the venv Python is used, not a system-level Python.',
            'All three servers can be kept running simultaneously. The --reload flag means code changes are picked up automatically without restarting.',
            'If the ML backend crashes, check the uvicorn terminal. The most common cause is a missing model file or a missing Python package. Run pip install -r requirements.txt to fix.',
        ],
    },
];

const BADGE_BG: Record<string, string> = {
    'from-purple-500 to-indigo-600': 'bg-purple-100 text-purple-700',
    'from-blue-500 to-cyan-600': 'bg-blue-100 text-blue-700',
    'from-emerald-500 to-teal-600': 'bg-emerald-100 text-emerald-700',
    'from-amber-500 to-orange-600': 'bg-amber-100 text-amber-700',
    'from-rose-500 to-pink-600': 'bg-rose-100 text-rose-700',
    'from-slate-500 to-gray-700': 'bg-slate-100 text-slate-700',
};

export default function Guidance() {
    return (
        <div className="space-y-8">
            {/* Hero header */}
            <div className="relative bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-700 rounded-2xl p-8 text-white overflow-hidden">
                <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/5 rounded-full" />
                <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/5 rounded-full" />

                <div className="relative z-10 flex items-start gap-5">
                    <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold">System Guidance</h2>
                        <p className="text-indigo-200 mt-2 text-sm leading-relaxed max-w-xl">
                            Everything you need to know to operate the AI-powered face recognition
                            attendance and score prediction system. Follow each section in order for
                            the best experience.
                        </p>
                    </div>
                </div>

                <div className="relative z-10 flex flex-wrap gap-3 mt-6">
                    {[
                        { icon: <ScanFace className="w-4 h-4" />, label: '3 AI Models' },
                        { icon: <Eye className="w-4 h-4" />, label: 'Liveness Detection' },
                        { icon: <Users className="w-4 h-4" />, label: 'Face Recognition' },
                        { icon: <GraduationCap className="w-4 h-4" />, label: 'Score Prediction' },
                        { icon: <Lock className="w-4 h-4" />, label: 'Anti-Spoofing' },
                        { icon: <Zap className="w-4 h-4" />, label: 'Real-time Processing' },
                    ].map(({ icon, label }) => (
                        <div key={label} className="flex items-center gap-1.5 bg-white/10 backdrop-blur rounded-full px-3 py-1.5 text-xs font-medium">
                            {icon} {label}
                        </div>
                    ))}
                </div>
            </div>

            {/* Sections */}
            {sections.map(section => (
                <div key={section.id} className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                    <div className={`bg-gradient-to-r ${section.color} px-6 py-5 text-white`}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                {section.icon}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">{section.title}</h3>
                                <p className="text-white/80 text-xs mt-0.5">{section.subtitle}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-5">
                        {section.steps && (
                            <div className="space-y-3">
                                {section.steps.map((step, i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${section.color} text-white flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5`}>
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                                            </div>
                                            <p className="text-xs text-gray-500 leading-relaxed ml-5">{step.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {section.tips && section.tips.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-gray-400 tracking-widest uppercase">Tips</p>
                                {section.tips.map((tip, i) => (
                                    <div key={i} className={`flex gap-2.5 rounded-xl p-3 ${BADGE_BG[section.color] ?? 'bg-gray-50 text-gray-700'}`}>
                                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs leading-relaxed font-medium">{tip}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {section.warnings && section.warnings.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-gray-400 tracking-widest uppercase">Caution</p>
                                {section.warnings.map((w, i) => (
                                    <div key={i} className="flex gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                                        <p className="text-xs leading-relaxed font-medium">{w}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ))}

            <div className="text-center text-xs text-gray-400 pb-4">
                Antigravity ML Portal &middot; AI-powered Face Attendance &amp; Score Prediction System
            </div>
        </div>
    );
}
