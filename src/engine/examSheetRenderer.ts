export interface SampleExamSheet {
  id: string;
  label: string;
  shortLabel: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  rubricId: string;
  subtitle: string;
  expectedStory: string;
  lines: Array<{
    questionLabel?: string;
    text: string;
    indent?: number;
  }>;
}

export const SAMPLE_EXAM_SHEETS: SampleExamSheet[] = [
  {
    id: 'sheet-aarav-math',
    label: 'Aarav Sharma · Class 7 Math (Sign & LCM gaps)',
    shortLabel: 'Aarav Sharma · Math UT2',
    studentId: 'st-01',
    studentName: 'Aarav Sharma',
    rollNo: '01',
    rubricId: 'cbse-7b-math-ut2',
    subtitle: 'Sign-transposition error in Q1 and direct denominator addition in Q2',
    expectedStory:
      'Aarav expands brackets properly in Q1, loses marks by writing 15 - 12 instead of 15 + 12, adds denominators straight across in Q2 (2/5), and aces Q3 perimeter.',
    lines: [
      { questionLabel: 'Q1', text: '3(x - 4) = 15' },
      { text: '3x - 12 = 15', indent: 1 },
      { text: '3x = 15 - 12', indent: 1 },
      { text: '3x = 3, x = 1', indent: 1 },
      { questionLabel: 'Q2', text: '1/2 + 1/3' },
      { text: '= (1 + 1) / (2 + 3)', indent: 1 },
      { text: '= 2/5', indent: 1 },
      { questionLabel: 'Q3', text: 'Perimeter = 2(l + b)' },
      { text: '= 2(8 + 5) = 2 x 13', indent: 1 },
      { text: '= 26 cm', indent: 1 },
    ],
  },
  {
    id: 'sheet-priya-math',
    label: 'Priya Nair · Class 7 Math (Full step mastery)',
    shortLabel: 'Priya Nair · Math UT2',
    studentId: 'st-02',
    studentName: 'Priya Nair',
    rollNo: '02',
    rubricId: 'cbse-7b-math-ut2',
    subtitle: 'Complete CBSE step-wise presentation across all three questions',
    expectedStory:
      'Priya shows every intermediate step cleanly: bracket expansion, sign flip, LCM conversion, and units.',
    lines: [
      { questionLabel: 'Q1', text: '3(x - 4) = 15' },
      { text: '3x - 12 = 15', indent: 1 },
      { text: '3x = 15 + 12 = 27', indent: 1 },
      { text: 'x = 27 / 3 = 9', indent: 1 },
      { questionLabel: 'Q2', text: 'LCM of 2 and 3 = 6' },
      { text: '1/2 + 1/3 = 3/6 + 2/6', indent: 1 },
      { text: '= 5/6', indent: 1 },
      { questionLabel: 'Q3', text: 'Perimeter = 2(l + b)' },
      { text: '= 2(8 + 5) = 2 x 13', indent: 1 },
      { text: '= 26 cm', indent: 1 },
    ],
  },
  {
    id: 'sheet-rohan-sci',
    label: 'Rohan Kulkarni · Class 6 Science (Partial credit)',
    shortLabel: 'Rohan Kulkarni · Science',
    studentId: 'st-03',
    studentName: 'Rohan Kulkarni',
    rollNo: '03',
    rubricId: 'cbse-6a-sci-check',
    subtitle: 'Understands sunlight and circuits, reverses gas exchange in photosynthesis',
    expectedStory:
      'Rohan correctly names sunlight, chlorophyll, and copper/plastic, but writes that photosynthesis releases carbon dioxide.',
    lines: [
      { questionLabel: 'Q1', text: 'Green plants make food using sunlight and chlorophyll.' },
      { text: 'Raw materials: water and air.', indent: 1 },
      { text: 'Equation: Water + Sunlight -> food and releases carbon dioxide', indent: 1 },
      { questionLabel: 'Q2', text: 'When switch is open, circuit is broken so current cannot flow.' },
      { text: 'Conductor: copper wire', indent: 1 },
      { text: 'Insulator: plastic cover', indent: 1 },
    ],
  },
];

/**
 * Renders a realistic Indian ruled-notebook exam sheet onto an HTML5 Canvas
 * so our real CV preprocessing + Tesseract.js OCR / Gemini Vision pipeline
 * processes genuine pixel data (blue horizontal lines, red left margin, cream paper, blue ballpoint ink).
 */
export function renderSampleExamSheetToDataUrl(sheet: SampleExamSheet): string {
  const width = 920;
  const height = 1140;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Warm Indian answer-booklet paper background
  ctx.fillStyle = '#FBF8F1';
  ctx.fillRect(0, 0, width, height);

  // Subtle paper grain dots
  ctx.fillStyle = 'rgba(130, 118, 96, 0.035)';
  for (let i = 0; i < 360; i++) {
    const px = (i * 97) % width;
    const py = (i * 173) % height;
    ctx.fillRect(px, py, 2, 2);
  }

  // 2. Top school header box
  ctx.strokeStyle = '#C95A4B';
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 28, width - 72, 108);

  ctx.fillStyle = '#2B2926';
  ctx.font = '600 22px "Instrument Sans", sans-serif';
  ctx.fillText('VIDYA BHARATI PUBLIC SCHOOL — ANSWER SHEET', 56, 66);

  ctx.fillStyle = '#57534E';
  ctx.font = '500 17px "IBM Plex Mono", monospace';
  ctx.fillText(`Name: ${sheet.studentName}`, 56, 104);
  ctx.fillText(`Roll No: ${sheet.rollNo}`, 420, 104);
  ctx.fillText(`Date: 24/11/2026`, 650, 104);

  // 3. Classic Indian notebook blue horizontal ruled lines + double red margin
  const firstRuleY = 192;
  const lineStep = 56;
  ctx.strokeStyle = 'rgba(92, 146, 212, 0.42)';
  ctx.lineWidth = 1.4;
  for (let y = firstRuleY; y < height - 48; y += lineStep) {
    ctx.beginPath();
    ctx.moveTo(36, y);
    ctx.lineTo(width - 36, y);
    ctx.stroke();
  }

  // Double red vertical margin line
  ctx.strokeStyle = 'rgba(201, 78, 66, 0.58)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(114, 144);
  ctx.lineTo(114, height - 36);
  ctx.moveTo(120, 144);
  ctx.lineTo(120, height - 36);
  ctx.stroke();

  // 4. Write realistic blue ballpoint pen answer lines
  // Keep Q1/Q2/Q3 close to the margin line so OCR binds them cleanly on the exact same row
  let rowIndex = 0;

  for (const item of sheet.lines) {
    if (item.questionLabel && rowIndex > 0) {
      rowIndex += 1;
    }
    const baselineY = firstRuleY + rowIndex * lineStep - 10;

    if (item.questionLabel) {
      ctx.font = '600 28px "Instrument Sans", sans-serif';
      ctx.fillStyle = '#152E5B';
      ctx.fillText(`${item.questionLabel}.`, 52, baselineY);
    }

    ctx.fillStyle = '#1C3D7A';
    ctx.font = '500 27px "Instrument Sans", sans-serif';
    const xPos = 140 + (item.indent ? item.indent * 24 : 0);

    ctx.fillText(item.text, xPos, baselineY);
    rowIndex += 1;
  }

  return canvas.toDataURL('image/png');
}
