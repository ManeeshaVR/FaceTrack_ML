import { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { StudentCard } from '../components/StudentCard';
import { CameraModal } from '../components/FaceRecordModal';
import { Student } from '../data/types';
import { studentApi } from '../data/api';

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await studentApi.getAll();
      if (response.data.success) {
        // Map backend student to frontend Student interface
        const mappedStudents: Student[] = response.data.data.map((s: any) => ({
          id: s.studentNo,
          _id: s.id, // Keep the MongoDB ID for API calls
          name: `${s.fName} ${s.lName}`,
          gender: s.gender,
          age: s.dateOfBirth ? new Date().getFullYear() - new Date(s.dateOfBirth).getFullYear() : 0,
          grade: `Grade ${s.grade}`,
          email: s.email,
          phone: s.phone,
          hasFaceData: s.embeddingsCount > 0,
          registeredClasses: s.classes || [],
          paymentStatus: s.isActive ? 'Active' : 'Inactive'
        }));
        setStudents(mappedStudents);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordFace = (student: Student) => {
    setSelectedStudent(student);
    setIsCameraOpen(true);
  };

  // Filter students based on search query
  const filteredStudents = students.filter(student => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    return (
      student.id.toLowerCase().includes(query) ||
      student.name.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Students</h2>
          <p className="text-gray-600 mt-1">Manage student profiles and face recognition data</p>
        </div>
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg">
          Total: {filteredStudents.length} Students
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by student ID or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Students Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-lg border border-gray-100">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
          <p className="text-gray-600 font-medium">Loading students...</p>
        </div>
      ) : filteredStudents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map(student => (
            <StudentCard
              key={student.id}
              student={student}
              onRecordFace={handleRecordFace}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
          <Search className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No students found</h3>
          <p className="text-gray-600">
            {searchQuery
              ? `No students match your search "${searchQuery}". Try a different search term.`
              : "No students available in the system."}
          </p>
        </div>
      )}

      {selectedStudent && (
        <CameraModal
          isOpen={isCameraOpen}
          onClose={() => {
            setIsCameraOpen(false);
            setSelectedStudent(null);
          }}
          studentName={selectedStudent.name}
          studentId={selectedStudent.id}
          studentMongoId={selectedStudent._id || ''}
        />
      )}
    </div>
  );
}