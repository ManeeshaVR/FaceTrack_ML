import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, ChevronDown, Loader2, AlertTriangle,
  BarChart3, Star, BookOpen, Info
} from 'lucide-react';
import { StudentAvatar } from '../components/StudentAvatar';
import { studentApi, scoreApi, predictApi } from '../data/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface StudentOption {
  _id: string;          // Mongo _id – needed for scores API
  displayId: string;    // studentNo – shown in dropdown
  name: string;
  gender: 'male' | 'female';
  grade: number;
}

interface TermRecord {
  id: string;
  grade: number;   // 9 | 10 | 11
  term: number;    // 1 | 2 | 3
  marks: number;
}

interface SubjectResult {
  subject: string;
  records: TermRecord[];           // sorted grade ASC, term ASC
  hasEnoughData: boolean;          // records.length === 9
  predictedScore?: number;
  predictedGrade?: string;
  predicting?: boolean;
  predictError?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const GRADE_ORDER: [number, number][] = [
  [9, 1], [9, 2], [9, 3],
  [10, 1], [10, 2], [10, 3],
  [11, 1], [11, 2], [11, 3],
];

function ol_grade(score: number): string {
  if (score >= 75) return 'A';
  if (score >= 65) return 'B';
  if (score >= 55) return 'C';
  if (score >= 35) return 'S';
  return 'F';
}

function getScoreColour(score: number) {
  if (score >= 75) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (score >= 65) return 'text-blue-700 bg-blue-50 border-blue-200';
  if (score >= 55) return 'text-amber-700 bg-amber-50 border-amber-200';
  if (score >= 35) return 'text-orange-700 bg-orange-50 border-orange-200';
  return 'text-red-700 bg-red-50 border-red-200';
}

function getPredictedGradient(grade: string) {
  switch (grade) {
    case 'A': return 'from-emerald-500 to-green-600';
    case 'B': return 'from-blue-500 to-indigo-600';
    case 'C': return 'from-amber-500 to-yellow-600';
    case 'S': return 'from-orange-500 to-red-500';
    default: return 'from-red-600 to-rose-700';
  }
}

// ── Toast component ───────────────────────────────────────────────────────────

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
      <div className="flex items-center gap-3 bg-gray-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-white/10">
        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <Info className="w-4 h-4 text-amber-400" />
        </div>
        <p className="text-sm font-medium">{message}</p>
        <button onClick={onClose} className="ml-2 text-gray-400 hover:text-white text-lg leading-none">&times;</button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Score() {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  const [selectedId, setSelectedId] = useState('');   // Mongo _id
  const [predicting, setPredicting] = useState(false);
  const [results, setResults] = useState<SubjectResult[] | null>(null);
  const [toast, setToast] = useState('');

  // Fetch Grade 11 students on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await studentApi.getAll({ grade: 11 });
        if (res.data.success) {
          setStudents(
            res.data.data.map((s: any): StudentOption => ({
              _id: s.id,
              displayId: s.studentNo,
              name: `${s.fName} ${s.lName}`,
              gender: s.gender === 'female' ? 'female' : 'male',
              grade: s.grade,
            }))
          );
        }
      } catch {
        setToast('Failed to load students.');
      } finally {
        setLoadingStudents(false);
      }
    })();
  }, []);

  const selectedStudent = students.find(s => s._id === selectedId);

  // Run predictions for all subjects of the selected student
  const handlePredict = useCallback(async () => {
    if (!selectedId) return;
    setPredicting(true);
    setResults(null);

    try {
      const scRes = await scoreApi.getByStudent(selectedId);
      const grouped = scRes.data.data;   // { [subjectName]: TermRecord[] }

      const subjectEntries = Object.entries(grouped);
      if (subjectEntries.length === 0) {
        setToast('This student has no score records.');
        setPredicting(false);
        return;
      }

      // Build initial result list, check data sufficiency
      const initial: SubjectResult[] = subjectEntries.map(([subject, records]) => {
        // Sort by grade ASC, term ASC (backend already sorts, but ensure)
        const sorted = [...records].sort((a, b) =>
          a.grade !== b.grade ? a.grade - b.grade : a.term - b.term
        );
        return {
          subject,
          records: sorted,
          hasEnoughData: sorted.length === 9,
        };
      });

      // If NO subject has 9 records → show toast, still render cards with "not enough" state
      if (!initial.some(s => s.hasEnoughData)) {
        setToast('Not enough records — each subject needs 9 term marks (Grade 9–11, 3 terms each).');
      }

      // Set results immediately so cards render while predictions run
      setResults(initial);

      // Call /predict for subjects that have 9 records
      const updated = await Promise.all(
        initial.map(async (item): Promise<SubjectResult> => {
          if (!item.hasEnoughData) return item;
          try {
            const features = GRADE_ORDER.map(([g, t]) => {
              const rec = item.records.find(r => r.grade === g && r.term === t);
              return rec?.marks ?? 0;
            });
            const pr = await predictApi.predict(features);
            return {
              ...item,
              predictedScore: pr.data.predicted_score,
              predictedGrade: pr.data.grade,
            };
          } catch {
            return { ...item, predictError: 'Prediction failed' };
          }
        })
      );

      setResults(updated);
    } catch {
      setToast('Failed to fetch scores. Please try again.');
    } finally {
      setPredicting(false);
    }
  }, [selectedId]);

  // ── Summary stats ────────────────────────────────────────────────────────────
  const predictedSubjects = results?.filter(r => r.predictedScore !== undefined) ?? [];
  const avgPredicted = predictedSubjects.length
    ? Math.round(predictedSubjects.reduce((s, r) => s + (r.predictedScore ?? 0), 0) / predictedSubjects.length)
    : null;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast('')} />}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Score Prediction</h2>
        <p className="text-gray-500 mt-1 text-sm">
          Predict a Grade 11 student's O/L final score using 9 term marks per subject
        </p>
      </div>

      {/* Controls card */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <div className="flex-1 w-full">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Grade 11 Student
            </label>
            <div className="relative">
              <select
                value={selectedId}
                onChange={e => { setSelectedId(e.target.value); setResults(null); }}
                disabled={loadingStudents}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none bg-white disabled:opacity-50 text-sm"
              >
                <option value="">
                  {loadingStudents ? 'Loading students…' : 'Choose a student…'}
                </option>
                {students.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.name} — {s.displayId}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <button
            onClick={handlePredict}
            disabled={!selectedId || predicting}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
          >
            {predicting
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Predicting…</>
              : <><TrendingUp className="w-5 h-5" /> Predict Scores</>}
          </button>
        </div>
      </div>

      {/* Results section */}
      {results && selectedStudent && (
        <div className="space-y-6">

          {/* Student hero card */}
          <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-blue-700 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center gap-5">
              <StudentAvatar gender={selectedStudent.gender} size="lg" className="flex-shrink-0 ring-4 ring-white/30" />
              <div className="flex-1">
                <h3 className="text-2xl font-bold">{selectedStudent.name}</h3>
                <p className="text-purple-200 text-sm mt-0.5">ID: {selectedStudent.displayId} · Grade {selectedStudent.grade}</p>
              </div>
              {avgPredicted !== null && (
                <div className="text-center bg-white/15 rounded-xl px-5 py-3">
                  <p className="text-xs text-purple-200 font-medium mb-1">AVG PREDICTED</p>
                  <p className="text-3xl font-bold">{avgPredicted}</p>
                  <p className="text-xs text-purple-200 mt-0.5">{ol_grade(avgPredicted)} Grade</p>
                </div>
              )}
            </div>

            {/* Quick stats row */}
            {predictedSubjects.length > 0 && (
              <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-white/20">
                {(['A', 'B', 'C', 'S/F'] as const).map(letter => {
                  const count = letter === 'S/F'
                    ? predictedSubjects.filter(s => (s.predictedScore ?? 0) < 55).length
                    : predictedSubjects.filter(s => ol_grade(s.predictedScore ?? 0) === letter).length;
                  return (
                    <div key={letter} className="text-center">
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-xs text-purple-200 mt-0.5">Grade {letter}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Subject cards grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {results.map((item, idx) => (
              <div key={idx} className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">

                {/* Card header */}
                <div className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-purple-50 px-5 py-4 border-b border-gray-100">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4 text-purple-600" />
                  </div>
                  <h4 className="font-bold text-gray-900 text-base">{item.subject}</h4>
                  <span className="ml-auto text-xs text-gray-400">{item.records.length}/9 records</span>
                </div>

                <div className="p-5 space-y-4">
                  {/* Term marks table */}
                  {[9, 10, 11].map(grade => (
                    <div key={grade}>
                      <p className="text-[10px] font-bold tracking-widest text-gray-400 mb-2">GRADE {grade}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3].map(term => {
                          const rec = item.records.find(r => r.grade === grade && r.term === term);
                          return (
                            <div
                              key={term}
                              className={`rounded-xl border px-2 py-2.5 text-center text-xs
                                ${rec
                                  ? getScoreColour(rec.marks)
                                  : 'text-gray-300 bg-gray-50 border-gray-100'}`}
                            >
                              <p className="font-medium mb-0.5">Term {term}</p>
                              {rec
                                ? <>
                                  <p className="text-lg font-bold leading-none">{rec.marks}</p>
                                  <p className="mt-0.5">{ol_grade(rec.marks)}</p>
                                </>
                                : <p className="text-lg font-bold leading-none text-gray-300">—</p>
                              }
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Prediction result */}
                  <div className="pt-3 border-t-2 border-dashed border-gray-200">
                    {item.hasEnoughData ? (
                      item.predictedScore !== undefined ? (
                        <div className={`bg-gradient-to-r ${getPredictedGradient(item.predictedGrade ?? 'F')} text-white rounded-xl px-4 py-4 text-center`}>
                          <div className="flex items-center justify-center gap-2 mb-1.5">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-xs font-semibold tracking-wide">PREDICTED O/L SCORE</span>
                          </div>
                          <p className="text-4xl font-black">{item.predictedScore}</p>
                          <div className="flex items-center justify-center gap-2 mt-1.5">
                            <Star className="w-3.5 h-3.5" />
                            <span className="text-sm font-semibold">{item.predictedGrade} Grade</span>
                          </div>
                        </div>
                      ) : item.predictError ? (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                          {item.predictError}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2 py-3 text-purple-600">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="text-sm">Calculating…</span>
                        </div>
                      )
                    ) : (
                      <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <BarChart3 className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-amber-800">Not enough records</p>
                          <p className="text-xs text-amber-600 mt-0.5">
                            {9 - item.records.length} more term mark{9 - item.records.length !== 1 ? 's' : ''} needed
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}