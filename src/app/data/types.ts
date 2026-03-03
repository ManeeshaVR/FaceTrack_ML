// ─── Shared application types ─────────────────────────────────────────────────

export interface Student {
    id: string;
    _id?: string;
    name: string;
    gender: 'male' | 'female';
    age: number;
    grade: string;
    email: string;
    phone: string;
    hasFaceData: boolean;
    registeredClasses: string[];
    paymentStatus: 'paid' | 'pending' | 'overdue' | 'Active' | 'Inactive';
}

export interface ClassSchedule {
    id: string;
    name: string;
    subject: string;
    time: string;
    day: string;
}

export interface SubjectScore {
    subject: string;
    g9Term1: number;
    g9Term2: number;
    g9Term3: number;
    g10Term1: number;
    g10Term2: number;
    g10Term3: number;
    g11Term1: number;
    g11Term2: number;
    g11Term3: number;
    predicted: number;
}
