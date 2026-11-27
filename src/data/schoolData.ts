export type BoardType = 'CBSE' | 'ICSE' | 'State Board';
export type ParentLanguage =
  | 'Hindi'
  | 'Hinglish'
  | 'Marathi'
  | 'Tamil'
  | 'Telugu'
  | 'Bengali'
  | 'English';

export type CompetencyLevel = 'Beginner' | 'Proficient' | 'Advanced';
export type ParakhDomain = 'Cognitive' | 'Socio-Emotional' | 'Psychomotor';
export type TarlTier = 'Foundation' | 'Core' | 'Challenge';

export interface ConceptNode {
  id: string;
  name: string;
  grade: string;
  subject: 'Mathematics' | 'Science' | 'Social Science';
  prerequisiteId?: string;
  remediationTipEn: string;
  remediationTipHi: string;
  blackboardExample: string;
}

export interface RubricStep {
  id: string;
  description: string;
  maxMarks: number;
  expectedKeywords: string[];
  mathTokens?: string[];
  commonTrap?: {
    trapName: string;
    badPattern: string[];
    explanation: string;
    prerequisiteConceptId: string;
  };
  conceptId: string;
}

export interface ExamQuestion {
  id: string;
  numberLabel: string;
  prompt: string;
  maxMarks: number;
  conceptId: string;
  steps: RubricStep[];
}

export interface ExamRubric {
  id: string;
  title: string;
  subject: 'Mathematics' | 'Science' | 'Social Science';
  className: string;
  board: BoardType;
  totalMarks: number;
  date: string;
  questions: ExamQuestion[];
}

export interface VoiceObservation {
  id: string;
  studentId: string;
  timestamp: string;
  language: string;
  rawTranscript: string;
  domain: ParakhDomain;
  level: CompetencyLevel;
  summary: string;
  isFlag?: boolean;
}

export interface StudentRecord {
  id: string;
  rollNo: string;
  name: string;
  className: string;
  apaarId: string;
  parentName: string;
  parentPhone: string;
  parentLanguage: ParentLanguage;
  attendancePct: number;
  attendanceDelta: number; // vs last month
  recentScorePct: number;
  scoreDelta: number; // vs last test
  tarlTier: TarlTier;
  conceptMastery: Record<string, number>; // conceptId -> 0..100
  hpcDomains: {
    cognitive: CompetencyLevel;
    socioEmotional: CompetencyLevel;
    psychomotor: CompetencyLevel;
  };
  hpcStrength: string;
  hpcFocusArea: string;
  selfReflection: string;
  parentVoiceInput: string;
  parentVoiceSubmitted: boolean;
  lastGradedExam?: string;
  riskLevel: 'Stable' | 'Watch' | 'At Risk';
  riskReason?: string;
}

export interface ApaarComplianceRecord {
  id: string;
  studentId: string;
  studentNameRegister: string;
  studentNameAadhaar: string;
  dobRegister: string;
  dobAadhaar: string;
  fatherNameRegister: string;
  fatherNameAadhaar: string;
  consentSigned: boolean;
  apaarStatus: 'Verified' | 'Name Mismatch' | 'DOB Swap' | 'Consent Pending';
}

export const CONCEPT_GRAPH: Record<string, ConceptNode> = {
  'c4-basic-ops': {
    id: 'c4-basic-ops',
    name: 'Basic Arithmetic & Number Sense',
    grade: 'Class 4',
    subject: 'Mathematics',
    remediationTipEn: 'Verify mental addition/subtraction facts with a visual number line.',
    remediationTipHi: 'Number line par chhote jod-ghatav ki 5-minute practice karwayein.',
    blackboardExample: '15 + 12 = 27  |  27 / 3 = 9',
  },
  'c5-integer-signs': {
    id: 'c5-integer-signs',
    name: 'Integer Sign Rules (+ / -)',
    grade: 'Class 5',
    subject: 'Mathematics',
    prerequisiteId: 'c4-basic-ops',
    remediationTipEn:
      'Practice moving terms across the "=" bridge: minus becomes plus on the opposite side.',
    remediationTipHi:
      '"=" ke dusri taraf le jaate waqt minus (-) plus (+) ban jaata hai — balance scale se dikhayein.',
    blackboardExample: 'Balance Rule:  3x - 12 = 15  -->  Add 12 to BOTH sides  -->  3x = 15 + 12 = 27',
  },
  'c6-transposition': {
    id: 'c6-transposition',
    name: 'Transposition & Balance Equality',
    grade: 'Class 6',
    subject: 'Mathematics',
    prerequisiteId: 'c5-integer-signs',
    remediationTipEn:
      'Teach equations as a physical taraju (weighing balance) before shortcut transposition.',
    remediationTipHi:
      'Shortcut sikhane se pehle samikaran ko taraju (balance) ki tarah dono taraf barabar rakhein.',
    blackboardExample: 'If 3x - 12 = 15, add +12 on Left & Right so -12 cancels out cleanly.',
  },
  'c7-linear-eq': {
    id: 'c7-linear-eq',
    name: 'Linear Equations in One Variable',
    grade: 'Class 7',
    subject: 'Mathematics',
    prerequisiteId: 'c6-transposition',
    remediationTipEn:
      'Expand brackets first, isolate variable terms cleanly, and substitute x back to check.',
    remediationTipHi:
      'Pehle bracket kholein, phir x ko akela karein, aur aakhri mein answer wapas daalkar check karein.',
    blackboardExample: '3(x - 4) = 15  =>  3x - 12 = 15  =>  3x = 27  =>  x = 9',
  },
  'c5-lcm-hcf': {
    id: 'c5-lcm-hcf',
    name: 'LCM & Equivalent Fractions',
    grade: 'Class 5',
    subject: 'Mathematics',
    prerequisiteId: 'c4-basic-ops',
    remediationTipEn:
      'Show with folded paper strips why 1/2 and 1/3 cannot be added until cut into equal 1/6 slices.',
    remediationTipHi:
      'Roti ya paper strip ke barabar tukde dikhayein: 1/2 aur 1/3 ko bina 6 barabar hisse kiye nahi jod sakte.',
    blackboardExample: 'LCM(2, 3) = 6  =>  1/2 = 3/6,  1/3 = 2/6  =>  3/6 + 2/6 = 5/6',
  },
  'c7-fractions-ops': {
    id: 'c7-fractions-ops',
    name: 'Addition of Unlike Fractions',
    grade: 'Class 7',
    subject: 'Mathematics',
    prerequisiteId: 'c5-lcm-hcf',
    remediationTipEn:
      'Break the denominator-addition habit (1/2 + 1/3 != 2/5) by estimating: 1/2 alone is already > 2/5!',
    remediationTipHi:
      'Andaza lagwana sikhayein: 1/2 khud 2/5 se bada hai, toh jodkar 2/5 kabhi nahi aa sakta.',
    blackboardExample: '1/2 + 1/3 = (3 + 2) / 6 = 5/6   (Never add bottoms 2+3!)',
  },
  'c6-perimeter-area': {
    id: 'c6-perimeter-area',
    name: 'Perimeter & Area Formulas',
    grade: 'Class 6',
    subject: 'Mathematics',
    prerequisiteId: 'c4-basic-ops',
    remediationTipEn:
      'Link Perimeter to "fencing the boundary" (units: cm) and Area to "tiling the floor" (units: sq cm).',
    remediationTipHi:
      'Perimeter matlab khet ki boundary (cm), Area matlab farsh par tiles (sq cm).',
    blackboardExample: 'Rectangle (l=8 cm, b=5 cm): Perimeter = 2(l+b) = 2(13) = 26 cm',
  },
  'c5-plant-parts': {
    id: 'c5-plant-parts',
    name: 'Plant Structure & Leaf Function',
    grade: 'Class 5',
    subject: 'Science',
    remediationTipEn:
      'Use a real green leaf to point out veins (water transport) and underside pores (stomata).',
    remediationTipHi:
      'Asli hari patti dikhakar nas (water) aur chhote chhed (stomata) samjhayein.',
    blackboardExample: 'Roots absorb water -> Stem carries -> Leaf makes food using sunlight',
  },
  'c6-photosynthesis': {
    id: 'c6-photosynthesis',
    name: 'Photosynthesis Inputs & Word Equation',
    grade: 'Class 6',
    subject: 'Science',
    prerequisiteId: 'c5-plant-parts',
    remediationTipEn:
      'Connect the four ingredients: Sunlight + Chlorophyll + CO2 + Water -> Glucose + Oxygen.',
    remediationTipHi:
      '4 cheezein yaad dilayein: Dhoop + Chlorophyll + CO2 + Paani -> Glucose + Oxygen.',
    blackboardExample: 'CO2 + Water --(Sunlight / Chlorophyll)--> Glucose + Oxygen',
  },
  'c6-electric-circuits': {
    id: 'c6-electric-circuits',
    name: 'Closed Circuits & Conductors',
    grade: 'Class 6',
    subject: 'Science',
    remediationTipEn:
      'Compare a closed circuit to an unbroken railway loop; any open switch stops current.',
    remediationTipHi:
      'Circuit ko band rail patri ki tarah dikhayein; switch khula toh current ruk jaata hai.',
    blackboardExample: 'Cell (+ to -) -> Closed Switch -> Bulb Glows (Copper conducts, Plastic insulates)',
  },
  'c8-constitution': {
    id: 'c8-constitution',
    name: 'Fundamental Rights & Parliamentary Checks',
    grade: 'Class 8',
    subject: 'Social Science',
    remediationTipEn:
      'Anchor each Fundamental Right to one daily school or community scenario.',
    remediationTipHi:
      'Har Fundamental Right ko rozmarra ke ek udaharan se jodein.',
    blackboardExample: 'Right to Equality (Art 14-18) | Right to Education (Art 21A)',
  },
};

export const EXAM_RUBRICS: ExamRubric[] = [
  {
    id: 'cbse-7b-math-ut2',
    title: 'Class 7 Mathematics — Unit Test 2',
    subject: 'Mathematics',
    className: 'Class 7B',
    board: 'CBSE',
    totalMarks: 10,
    date: '24 Nov 2026',
    questions: [
      {
        id: 'q1',
        numberLabel: 'Q1',
        prompt: 'Solve for x: 3(x - 4) = 15',
        maxMarks: 3,
        conceptId: 'c7-linear-eq',
        steps: [
          {
            id: 'q1-s1',
            description: 'Expand brackets correctly: 3x - 12 = 15 (or divide by 3 to get x - 4 = 5)',
            maxMarks: 1,
            expectedKeywords: ['3x - 12 = 15', '3x-12=15', '3x - 12', 'x - 4 = 5'],
            mathTokens: ['3x', '12', '15'],
            conceptId: 'c7-linear-eq',
          },
          {
            id: 'q1-s2',
            description: 'Transpose -12 to RHS with sign change: 3x = 15 + 12 = 27',
            maxMarks: 1,
            expectedKeywords: ['15 + 12', '15+12', '27', '3x = 27', '3x=27', '5 + 4'],
            mathTokens: ['27', '+ 12', '+12'],
            commonTrap: {
              trapName: 'Sign-Transposition Error',
              badPattern: ['15 - 12', '15-12', '3x = 3', '3x=3'],
              explanation:
                'Kept negative sign while moving -12 across "=" (wrote 15 - 12 instead of 15 + 12).',
              prerequisiteConceptId: 'c5-integer-signs',
            },
            conceptId: 'c6-transposition',
          },
          {
            id: 'q1-s3',
            description: 'Divide both sides by 3 to obtain final answer: x = 9',
            maxMarks: 1,
            expectedKeywords: ['x = 9', 'x=9', '27/3', '27 / 3'],
            mathTokens: ['x=9', 'x = 9'],
            conceptId: 'c7-linear-eq',
          },
        ],
      },
      {
        id: 'q2',
        numberLabel: 'Q2',
        prompt: 'Add the fractions: 1/2 + 1/3',
        maxMarks: 3,
        conceptId: 'c7-fractions-ops',
        steps: [
          {
            id: 'q2-s1',
            description: 'Identify common denominator LCM(2, 3) = 6',
            maxMarks: 1,
            expectedKeywords: ['lcm', '6', 'common denominator'],
            mathTokens: ['6'],
            commonTrap: {
              trapName: 'Direct Denominator Addition',
              badPattern: ['2/5', '2 / 5', '2+3', '2 + 3'],
              explanation:
                'Added numerators and denominators straight across (1+1)/(2+3) = 2/5 without taking LCM.',
              prerequisiteConceptId: 'c5-lcm-hcf',
            },
            conceptId: 'c5-lcm-hcf',
          },
          {
            id: 'q2-s2',
            description: 'Convert to equivalent fractions: 3/6 + 2/6',
            maxMarks: 1,
            expectedKeywords: ['3/6', '2/6', '3 + 2', '3+2'],
            mathTokens: ['3/6', '2/6'],
            conceptId: 'c5-lcm-hcf',
          },
          {
            id: 'q2-s3',
            description: 'Add numerators to reach final sum: 5/6',
            maxMarks: 1,
            expectedKeywords: ['5/6', '5 / 6'],
            mathTokens: ['5/6'],
            conceptId: 'c7-fractions-ops',
          },
        ],
      },
      {
        id: 'q3',
        numberLabel: 'Q3',
        prompt: 'Find the perimeter of a rectangle with length 8 cm and breadth 5 cm.',
        maxMarks: 4,
        conceptId: 'c6-perimeter-area',
        steps: [
          {
            id: 'q3-s1',
            description: 'State formula: Perimeter = 2(l + b)',
            maxMarks: 1,
            expectedKeywords: ['2(l + b)', '2(l+b)', '2 x (l + b)', 'perimeter', 'formula'],
            mathTokens: ['2(l+b)', 'perimeter'],
            conceptId: 'c6-perimeter-area',
          },
          {
            id: 'q3-s2',
            description: 'Substitute values: 2(8 + 5) = 2 x 13',
            maxMarks: 1.5,
            expectedKeywords: ['8 + 5', '8+5', '13', '2 x 13', '2(13)'],
            mathTokens: ['13', '8', '5'],
            conceptId: 'c6-perimeter-area',
          },
          {
            id: 'q3-s3',
            description: 'Final answer with correct unit: 26 cm',
            maxMarks: 1.5,
            expectedKeywords: ['26 cm', '26cm', '26'],
            mathTokens: ['26'],
            conceptId: 'c6-perimeter-area',
          },
        ],
      },
    ],
  },
  {
    id: 'cbse-6a-sci-check',
    title: 'Class 6 Science — Chapter Check',
    subject: 'Science',
    className: 'Class 6A',
    board: 'CBSE',
    totalMarks: 10,
    date: '22 Nov 2026',
    questions: [
      {
        id: 'sq1',
        numberLabel: 'Q1',
        prompt: 'Define photosynthesis and write its word equation.',
        maxMarks: 5,
        conceptId: 'c6-photosynthesis',
        steps: [
          {
            id: 'sq1-s1',
            description: 'Mentions green plants making food using sunlight and chlorophyll',
            maxMarks: 2,
            expectedKeywords: ['sunlight', 'chlorophyll', 'green', 'food'],
            conceptId: 'c6-photosynthesis',
          },
          {
            id: 'sq1-s2',
            description: 'Identifies raw materials: carbon dioxide (CO2) and water',
            maxMarks: 1.5,
            expectedKeywords: ['carbon dioxide', 'co2', 'water'],
            conceptId: 'c5-plant-parts',
          },
          {
            id: 'sq1-s3',
            description: 'States products correctly: glucose / starch and oxygen',
            maxMarks: 1.5,
            expectedKeywords: ['glucose', 'starch', 'oxygen', 'o2'],
            commonTrap: {
              trapName: 'Reversed Gas Exchange',
              badPattern: ['releases carbon dioxide', 'gives co2'],
              explanation:
                'Confused respiration with photosynthesis — plants release oxygen, not CO2, during photosynthesis.',
              prerequisiteConceptId: 'c5-plant-parts',
            },
            conceptId: 'c6-photosynthesis',
          },
        ],
      },
      {
        id: 'sq2',
        numberLabel: 'Q2',
        prompt: 'Why does a bulb not glow when the switch is open? Name one conductor and one insulator.',
        maxMarks: 5,
        conceptId: 'c6-electric-circuits',
        steps: [
          {
            id: 'sq2-s1',
            description: 'Explains open switch breaks the path / incomplete circuit stops current flow',
            maxMarks: 2,
            expectedKeywords: ['broken', 'incomplete', 'open', 'current', 'flow', 'gap'],
            conceptId: 'c6-electric-circuits',
          },
          {
            id: 'sq2-s2',
            description: 'Names a valid conductor (copper, iron, aluminium, metal)',
            maxMarks: 1.5,
            expectedKeywords: ['copper', 'iron', 'metal', 'aluminium', 'silver'],
            conceptId: 'c6-electric-circuits',
          },
          {
            id: 'sq2-s3',
            description: 'Names a valid insulator (plastic, rubber, wood, glass)',
            maxMarks: 1.5,
            expectedKeywords: ['plastic', 'rubber', 'wood', 'glass'],
            conceptId: 'c6-electric-circuits',
          },
        ],
      },
    ],
  },
];

export const INITIAL_STUDENTS: StudentRecord[] = [
  {
    id: 'st-01',
    rollNo: '01',
    name: 'Aarav Sharma',
    className: 'Class 7B',
    apaarId: '4821-9034-1128',
    parentName: 'Rajesh Sharma',
    parentPhone: '+91 98220 41102',
    parentLanguage: 'Hindi',
    attendancePct: 86,
    attendanceDelta: -4,
    recentScorePct: 55,
    scoreDelta: -11,
    tarlTier: 'Foundation',
    conceptMastery: {
      'c5-integer-signs': 42,
      'c6-transposition': 48,
      'c7-linear-eq': 52,
      'c5-lcm-hcf': 40,
      'c7-fractions-ops': 44,
      'c6-perimeter-area': 88,
    },
    hpcDomains: {
      cognitive: 'Beginner',
      socioEmotional: 'Proficient',
      psychomotor: 'Advanced',
    },
    hpcStrength: 'Accurate geometry diagrams and enthusiastic sports/lab participation',
    hpcFocusArea: 'Integer sign rules when transposing terms and LCM for unlike fractions',
    selfReflection: 'I understood rectangle perimeter well, but minus signs confuse me in equations.',
    parentVoiceInput: 'Aarav practices neatly at home when given 3 short step-by-step sums.',
    parentVoiceSubmitted: true,
    lastGradedExam: 'Class 7 Mathematics — Unit Test 2',
    riskLevel: 'At Risk',
    riskReason: 'Two prerequisite Class 5 math gaps compounding in Class 7 algebra',
  },
  {
    id: 'st-02',
    rollNo: '02',
    name: 'Priya Nair',
    className: 'Class 7B',
    apaarId: '7192-4401-8832',
    parentName: 'Meera Nair',
    parentPhone: '+91 98451 22910',
    parentLanguage: 'English',
    attendancePct: 96,
    attendanceDelta: 2,
    recentScorePct: 92,
    scoreDelta: 6,
    tarlTier: 'Challenge',
    conceptMastery: {
      'c5-integer-signs': 94,
      'c6-transposition': 91,
      'c7-linear-eq': 95,
      'c5-lcm-hcf': 89,
      'c7-fractions-ops': 92,
      'c6-perimeter-area': 96,
    },
    hpcDomains: {
      cognitive: 'Advanced',
      socioEmotional: 'Advanced',
      psychomotor: 'Proficient',
    },
    hpcStrength: 'Leads peer explanations clearly and verifies answers by back-substitution',
    hpcFocusArea: 'Multi-step word problems combining fractions and linear equations',
    selfReflection: 'I liked helping my bench partner check fraction LCM steps today.',
    parentVoiceInput: 'Priya enjoys reading science encyclopedias after completing homework.',
    parentVoiceSubmitted: true,
    lastGradedExam: 'Class 7 Mathematics — Unit Test 2',
    riskLevel: 'Stable',
  },
  {
    id: 'st-03',
    rollNo: '03',
    name: 'Rohan Kulkarni',
    className: 'Class 7B',
    apaarId: '3309-8812-5409',
    parentName: 'Suresh Kulkarni',
    parentPhone: '+91 97654 11892',
    parentLanguage: 'Marathi',
    attendancePct: 74,
    attendanceDelta: -9,
    recentScorePct: 48,
    scoreDelta: -14,
    tarlTier: 'Foundation',
    conceptMastery: {
      'c5-integer-signs': 46,
      'c6-transposition': 44,
      'c7-linear-eq': 42,
      'c5-lcm-hcf': 38,
      'c7-fractions-ops': 41,
      'c6-perimeter-area': 76,
    },
    hpcDomains: {
      cognitive: 'Beginner',
      socioEmotional: 'Beginner',
      psychomotor: 'Proficient',
    },
    hpcStrength: 'Strong oral mental arithmetic when prompted one-on-one in Marathi',
    hpcFocusArea: 'Quiet during group work; needs visual LCM paper-strip scaffolding',
    selfReflection: 'I hesitate to raise my hand when others finish fast.',
    parentVoiceInput: '',
    parentVoiceSubmitted: false,
    lastGradedExam: 'Class 7 Mathematics — Unit Test 2',
    riskLevel: 'At Risk',
    riskReason: 'Attendance dropped 9% this month alongside 14% drop in math mastery',
  },
  {
    id: 'st-04',
    rollNo: '04',
    name: 'Ananya Verma',
    className: 'Class 7B',
    apaarId: '9910-2318-6621',
    parentName: 'Sunita Verma',
    parentPhone: '+91 98114 77420',
    parentLanguage: 'Hinglish',
    attendancePct: 91,
    attendanceDelta: 1,
    recentScorePct: 76,
    scoreDelta: 4,
    tarlTier: 'Core',
    conceptMastery: {
      'c5-integer-signs': 78,
      'c6-transposition': 74,
      'c7-linear-eq': 76,
      'c5-lcm-hcf': 62,
      'c7-fractions-ops': 68,
      'c6-perimeter-area': 85,
    },
    hpcDomains: {
      cognitive: 'Proficient',
      socioEmotional: 'Proficient',
      psychomotor: 'Advanced',
    },
    hpcStrength: 'Consistent neat step presentation and creative art-integrated notebooks',
    hpcFocusArea: 'Double-checking LCM conversions under timed test pressure',
    selfReflection: 'Writing formulas first helped me avoid silly mistakes in Q3.',
    parentVoiceInput: 'Ananya spends 30 minutes revising math every evening.',
    parentVoiceSubmitted: true,
    lastGradedExam: 'Class 7 Mathematics — Unit Test 2',
    riskLevel: 'Stable',
  },
  {
    id: 'st-05',
    rollNo: '05',
    name: 'Karthik Subramanian',
    className: 'Class 7B',
    apaarId: '6120-5591-3014',
    parentName: 'Lakshmi Subramanian',
    parentPhone: '+91 98402 66518',
    parentLanguage: 'Tamil',
    attendancePct: 94,
    attendanceDelta: 0,
    recentScorePct: 84,
    scoreDelta: 5,
    tarlTier: 'Challenge',
    conceptMastery: {
      'c5-integer-signs': 86,
      'c6-transposition': 84,
      'c7-linear-eq': 85,
      'c5-lcm-hcf': 80,
      'c7-fractions-ops': 82,
      'c6-perimeter-area': 90,
    },
    hpcDomains: {
      cognitive: 'Advanced',
      socioEmotional: 'Proficient',
      psychomotor: 'Proficient',
    },
    hpcStrength: 'Fast logical reasoning and strong curiosity in science models',
    hpcFocusArea: 'Writing intermediate steps clearly for CBSE step-marking credit',
    selfReflection: 'Sometimes I jump directly to the final answer and miss writing the formula.',
    parentVoiceInput: 'Karthik likes solving puzzles and explaining them to his younger sister.',
    parentVoiceSubmitted: true,
    lastGradedExam: 'Class 7 Mathematics — Unit Test 2',
    riskLevel: 'Stable',
  },
  {
    id: 'st-06',
    rollNo: '06',
    name: 'Zoya Khan',
    className: 'Class 7B',
    apaarId: '5044-7723-1982',
    parentName: 'Imran Khan',
    parentPhone: '+91 98231 55091',
    parentLanguage: 'Hindi',
    attendancePct: 82,
    attendanceDelta: -5,
    recentScorePct: 64,
    scoreDelta: -6,
    tarlTier: 'Core',
    conceptMastery: {
      'c5-integer-signs': 65,
      'c6-transposition': 62,
      'c7-linear-eq': 66,
      'c5-lcm-hcf': 54,
      'c7-fractions-ops': 58,
      'c6-perimeter-area': 81,
    },
    hpcDomains: {
      cognitive: 'Proficient',
      socioEmotional: 'Advanced',
      psychomotor: 'Proficient',
    },
    hpcStrength: 'Empathetic team coordinator during debates and science projects',
    hpcFocusArea: 'Strengthening equivalent fractions before moving to algebraic fractions',
    selfReflection: 'I want to get faster at finding LCM for denominators like 6, 8, and 12.',
    parentVoiceInput: '',
    parentVoiceSubmitted: false,
    lastGradedExam: 'Class 7 Mathematics — Unit Test 2',
    riskLevel: 'Watch',
    riskReason: 'Fraction LCM below 60% and 5% attendance dip over last 3 weeks',
  },
  {
    id: 'st-07',
    rollNo: '07',
    name: 'Devansh Chatterjee',
    className: 'Class 7B',
    apaarId: '8873-1204-7745',
    parentName: 'Anirban Chatterjee',
    parentPhone: '+91 98301 44903',
    parentLanguage: 'Bengali',
    attendancePct: 89,
    attendanceDelta: 3,
    recentScorePct: 71,
    scoreDelta: 7,
    tarlTier: 'Core',
    conceptMastery: {
      'c5-integer-signs': 72,
      'c6-transposition': 70,
      'c7-linear-eq': 73,
      'c5-lcm-hcf': 64,
      'c7-fractions-ops': 69,
      'c6-perimeter-area': 79,
    },
    hpcDomains: {
      cognitive: 'Proficient',
      socioEmotional: 'Proficient',
      psychomotor: 'Advanced',
    },
    hpcStrength: 'Steady upward trajectory; excels in music and spatial drawing',
    hpcFocusArea: 'Carefully labelling units (cm vs sq cm) in mensuration answers',
    selfReflection: 'Checking my signs twice improved my score by 7% this test.',
    parentVoiceInput: 'We noticed Devansh feels more confident after the weekly audio updates.',
    parentVoiceSubmitted: true,
    lastGradedExam: 'Class 7 Mathematics — Unit Test 2',
    riskLevel: 'Stable',
  },
  {
    id: 'st-08',
    rollNo: '08',
    name: 'Sneha Reddy',
    className: 'Class 7B',
    apaarId: '2290-6631-9044',
    parentName: 'Venkatesh Reddy',
    parentPhone: '+91 98490 33218',
    parentLanguage: 'Telugu',
    attendancePct: 79,
    attendanceDelta: -6,
    recentScorePct: 58,
    scoreDelta: -8,
    tarlTier: 'Foundation',
    conceptMastery: {
      'c5-integer-signs': 52,
      'c6-transposition': 54,
      'c7-linear-eq': 56,
      'c5-lcm-hcf': 49,
      'c7-fractions-ops': 52,
      'c6-perimeter-area': 78,
    },
    hpcDomains: {
      cognitive: 'Beginner',
      socioEmotional: 'Proficient',
      psychomotor: 'Proficient',
    },
    hpcStrength: 'Polite, attentive listener who follows worked examples accurately',
    hpcFocusArea: 'Building confidence to start unfamiliar algebra sums independently',
    selfReflection: 'When a question has brackets I get stuck on the very first step.',
    parentVoiceInput: '',
    parentVoiceSubmitted: false,
    lastGradedExam: 'Class 7 Mathematics — Unit Test 2',
    riskLevel: 'Watch',
    riskReason: 'Bracket expansion and integer signs below proficiency; parent reply pending',
  },
];

export const INITIAL_VOICE_OBSERVATIONS: VoiceObservation[] = [
  {
    id: 'obs-1',
    studentId: 'st-02',
    timestamp: 'Today, 11:15 AM',
    language: 'Hinglish',
    rawTranscript:
      'Aaj science lab mein Priya ne group lead kiya aur photosynthesis experiment bahut clearly explain kiya.',
    domain: 'Socio-Emotional',
    level: 'Advanced',
    summary: 'Demonstrated peer leadership and clear oral explanation during science lab activity.',
  },
  {
    id: 'obs-2',
    studentId: 'st-03',
    timestamp: 'Today, 11:15 AM',
    language: 'Hinglish',
    rawTranscript:
      'Rohan class mein thoda quiet tha aur fractions ke LCM mein abhi bhi confuse ho raha hai.',
    domain: 'Cognitive',
    level: 'Beginner',
    summary: 'Reserved during peer discussion; requires scaffolded practice on fraction LCM.',
    isFlag: true,
  },
  {
    id: 'obs-3',
    studentId: 'st-01',
    timestamp: 'Yesterday, 2:40 PM',
    language: 'English (IN)',
    rawTranscript:
      'Aarav drew the cleanest circuit diagram in the section and helped set up the football cones.',
    domain: 'Psychomotor',
    level: 'Advanced',
    summary: 'High spatial precision in diagram work and proactive physical coordination.',
  },
];

export const INITIAL_APAAR_RECORDS: ApaarComplianceRecord[] = [
  {
    id: 'ap-1',
    studentId: 'st-01',
    studentNameRegister: 'Aarav Kr. Sharma',
    studentNameAadhaar: 'Aarav Kumar Sharma',
    dobRegister: '14/08/2013',
    dobAadhaar: '14/08/2013',
    fatherNameRegister: 'Rajesh Sharma',
    fatherNameAadhaar: 'Rajesh Kumar Sharma',
    consentSigned: true,
    apaarStatus: 'Name Mismatch',
  },
  {
    id: 'ap-2',
    studentId: 'st-02',
    studentNameRegister: 'Priya Nair',
    studentNameAadhaar: 'Priya Nair',
    dobRegister: '03/11/2013',
    dobAadhaar: '03/11/2013',
    fatherNameRegister: 'Suresh Nair',
    fatherNameAadhaar: 'Suresh Nair',
    consentSigned: true,
    apaarStatus: 'Verified',
  },
  {
    id: 'ap-3',
    studentId: 'st-03',
    studentNameRegister: 'Rohan Kulkarni',
    studentNameAadhaar: 'Rohan Kulkarni',
    dobRegister: '04/07/2013',
    dobAadhaar: '07/04/2013',
    fatherNameRegister: 'Suresh Kulkarni',
    fatherNameAadhaar: 'Suresh Kulkarni',
    consentSigned: false,
    apaarStatus: 'DOB Swap',
  },
  {
    id: 'ap-4',
    studentId: 'st-04',
    studentNameRegister: 'Ananya Verma',
    studentNameAadhaar: 'Ananya Verma',
    dobRegister: '21/02/2013',
    dobAadhaar: '21/02/2013',
    fatherNameRegister: 'Amit Verma',
    fatherNameAadhaar: 'Amit Verma',
    consentSigned: true,
    apaarStatus: 'Verified',
  },
  {
    id: 'ap-5',
    studentId: 'st-06',
    studentNameRegister: 'Zoya Khan',
    studentNameAadhaar: 'Zoya Khan',
    dobRegister: '19/05/2013',
    dobAadhaar: '19/05/2013',
    fatherNameRegister: 'Imran Khan',
    fatherNameAadhaar: 'Imran Khan',
    consentSigned: false,
    apaarStatus: 'Consent Pending',
  },
];
