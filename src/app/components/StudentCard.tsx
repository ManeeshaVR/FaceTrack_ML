import { Camera } from 'lucide-react';
import { Student } from '../data/types';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface StudentCardProps {
  student: Student;
  onRecordFace: (student: Student) => void;
}

const getCartoonAvatar = (name: string) => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50`;
};

const getGradientColor = (gender: string) => {
  return gender.toLowerCase() === "male"
      ? "from-blue-500 to-cyan-500"
      : "from-pink-500 to-purple-500";
};

export function StudentCard({ student, onRecordFace }: StudentCardProps) {
  const isActive = student.paymentStatus === 'Active';

  return (
      <Card className="hover:shadow-xl transition-all hover:-translate-y-1 border-0 bg-gradient-to-br from-white to-gray-50 flex flex-col h-full overflow-hidden">
        <CardContent className="p-6 flex flex-col flex-1">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getGradientColor(student.gender)} p-1 shadow-lg`}>
                <div className="w-full h-full rounded-full overflow-hidden bg-white">
                  <img
                      src={getCartoonAvatar(student.name)}
                      alt={student.name}
                      className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{student.name}</h3>
                <p className="text-sm text-gray-500">{student.id}</p>
              </div>
            </div>
            <Badge className={isActive ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}>
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Email:</span>
              <span className="text-gray-900 truncate max-w-[200px]">{student.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Phone:</span>
              <span className="text-gray-900">{student.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Grade:</span>
              <span className="text-gray-900">{student.grade}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Gender:</span>
              <span className="text-gray-900 capitalize">{student.gender}</span>
            </div>
          </div>

          {/* Face Data Status indicator */}
          <div className="mb-4">
            {student.hasFaceData ? (
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-700 font-medium">Face Data Registered</span>
                </div>
            ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="text-sm text-gray-600 font-medium">No Face Data Recorded</span>
                </div>
            )}
          </div>

          {/* Record Face Button */}
          <div className="mt-auto pt-4 border-t border-gray-100">
            <Button
                onClick={() => onRecordFace(student)}
                disabled={student.paymentStatus === 'Inactive'}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all"
            >
              <Camera className="w-4 h-4 mr-2" />
              Record Face
            </Button>
          </div>
        </CardContent>
      </Card>
  );
}