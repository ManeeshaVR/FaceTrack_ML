interface StudentAvatarProps {
  gender: 'male' | 'female';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StudentAvatar({ gender, size = 'md', className = '' }: StudentAvatarProps) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  // Cartoon-style avatars using SVG
  if (gender === 'female') {
    return (
      <div className={`${sizeClasses[size]} ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Background circle */}
          <circle cx="50" cy="50" r="48" fill="#FFE5E5" />
          
          {/* Face */}
          <circle cx="50" cy="45" r="25" fill="#FFD4B3" />
          
          {/* Hair */}
          <path d="M 25 35 Q 25 15, 50 15 Q 75 15, 75 35 Q 75 40, 70 42 L 70 50 Q 50 45, 30 50 L 30 42 Q 25 40, 25 35" fill="#8B4513" />
          
          {/* Eyes */}
          <circle cx="42" cy="42" r="3" fill="#2C1810" />
          <circle cx="58" cy="42" r="3" fill="#2C1810" />
          <circle cx="43" cy="41" r="1" fill="white" />
          <circle cx="59" cy="41" r="1" fill="white" />
          
          {/* Eyelashes */}
          <line x1="40" y1="39" x2="38" y2="37" stroke="#2C1810" strokeWidth="1" />
          <line x1="44" y1="39" x2="46" y2="37" stroke="#2C1810" strokeWidth="1" />
          <line x1="56" y1="39" x2="54" y2="37" stroke="#2C1810" strokeWidth="1" />
          <line x1="60" y1="39" x2="62" y2="37" stroke="#2C1810" strokeWidth="1" />
          
          {/* Nose */}
          <path d="M 50 48 Q 51 50, 50 51" stroke="#FFB380" fill="none" strokeWidth="1" />
          
          {/* Smile */}
          <path d="M 42 52 Q 50 57, 58 52" stroke="#FF6B9D" fill="none" strokeWidth="2" strokeLinecap="round" />
          
          {/* Blush */}
          <ellipse cx="38" cy="48" rx="4" ry="3" fill="#FFB3BA" opacity="0.5" />
          <ellipse cx="62" cy="48" rx="4" ry="3" fill="#FFB3BA" opacity="0.5" />
          
          {/* Body */}
          <path d="M 30 70 Q 35 65, 50 65 Q 65 65, 70 70 L 70 85 Q 50 90, 30 85 Z" fill="#E91E63" />
        </svg>
      </div>
    );
  } else {
    return (
      <div className={`${sizeClasses[size]} ${className}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Background circle */}
          <circle cx="50" cy="50" r="48" fill="#E3F2FD" />
          
          {/* Face */}
          <circle cx="50" cy="45" r="25" fill="#FFD4B3" />
          
          {/* Hair */}
          <path d="M 30 30 Q 30 18, 50 15 Q 70 18, 70 30 L 70 40 Q 68 38, 65 38 L 65 35 Q 50 32, 35 35 L 35 38 Q 32 38, 30 40 Z" fill="#3E2723" />
          
          {/* Eyes */}
          <circle cx="42" cy="42" r="3" fill="#2C1810" />
          <circle cx="58" cy="42" r="3" fill="#2C1810" />
          <circle cx="43" cy="41" r="1" fill="white" />
          <circle cx="59" cy="41" r="1" fill="white" />
          
          {/* Eyebrows */}
          <path d="M 38 37 Q 42 36, 46 37" stroke="#2C1810" fill="none" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 54 37 Q 58 36, 62 37" stroke="#2C1810" fill="none" strokeWidth="1.5" strokeLinecap="round" />
          
          {/* Nose */}
          <path d="M 50 48 Q 51 50, 50 51" stroke="#FFB380" fill="none" strokeWidth="1" />
          
          {/* Smile */}
          <path d="M 42 52 Q 50 57, 58 52" stroke="#795548" fill="none" strokeWidth="2" strokeLinecap="round" />
          
          {/* Body */}
          <path d="M 30 70 Q 35 65, 50 65 Q 65 65, 70 70 L 70 85 Q 50 90, 30 85 Z" fill="#2196F3" />
          
          {/* Collar */}
          <path d="M 45 65 L 42 75 L 48 75 Z" fill="white" />
          <path d="M 55 65 L 58 75 L 52 75 Z" fill="white" />
        </svg>
      </div>
    );
  }
}
