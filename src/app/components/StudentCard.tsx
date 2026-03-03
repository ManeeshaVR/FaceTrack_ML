import { Camera } from 'lucide-react';
import { Student } from '../data/types';
import { StudentAvatar } from './StudentAvatar';

interface StudentCardProps {
  student: Student;
  onRecordFace: (student: Student) => void;
}

export function StudentCard({ student, onRecordFace }: StudentCardProps) {
  const statusColors = {
    paid: 'bg-green-100 text-green-800 border-green-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    overdue: 'bg-red-100 text-red-800 border-red-200',
    Active: 'bg-white text-green-500 border-green-200',
    Inactive: 'bg-white text-red-500 border-red-200'
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all overflow-hidden border border-gray-100">
      {/* Card Header with Gradient */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">{student.name}</h3>
            <p className="text-purple-100 text-sm">{student.id}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[student.paymentStatus]}`}>
            {student.paymentStatus.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <StudentAvatar gender={student.gender} size="md" />
          <div className="flex-1 space-y-2">
            <div>
              <p className="text-sm text-gray-500">Grade</p>
              <p className="font-medium text-gray-900">{student.grade}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Age</p>
              <p className="font-medium text-gray-900">{student.age} years</p>
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="text-sm font-medium text-gray-900">{student.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="text-sm font-medium text-gray-900">{student.phone}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Registered Classes</p>
            <p className="text-sm font-medium text-gray-900">{student.registeredClasses.length} classes</p>
          </div>
        </div>

        {/* Face Data Status */}
        <div className="mb-4">
          {student.hasFaceData ? (
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-700 font-medium">Face Data Registered</span>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-sm text-gray-600 font-medium">No Face Data</span>
            </div>
          )}
        </div>

        {/* Record Face Button */}
        <button
          onClick={() => onRecordFace(student)}
          disabled={student.paymentStatus === 'Inactive'}
          className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${student.paymentStatus === 'Inactive'
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg hover:scale-105'
            }`}
        >
          <Camera className="w-5 h-5" />
          Record Face
        </button>
      </div>
    </div>
  );
}
