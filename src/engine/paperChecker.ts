import { createWorker } from 'tesseract.js';
import {
  CONCEPT_GRAPH,
  type ConceptNode,
  type ExamQuestion,
  type ExamRubric,
  type RubricStep,
} from '../data/schoolData';

export interface InkBand {
  yStartPct: number;
  yEndPct: number;
  inkDensity: number;
}

export interface PreprocessingLayers {
  width: number;
  height: number;
  originalDataUrl: string;
  linesRemovedDataUrl: string;
  binarizedDataUrl: string;
  inkBands: InkBand[];
  ruledPixelsSuppressedPct: number;
}

export interface RecognizedLine {
  text: string;
  confidence: number; // 0..100
  bboxPct: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface GradedStepResult {
  stepId: string;
  description: string;
  maxMarks: number;
  awardedMarks: number;
  status: 'full' | 'partial' | 'missed' | 'trap';
  confidence: number; // 0..100
  needsTeacherEye: boolean;
  matchedText: string;
  reason: string;
  trapDetected?: {
    trapName: string;
    explanation: string;
    prerequisiteConceptId: string;
  };
  conceptId: string;
  bboxPct?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  teacherOverridden?: boolean;
}

export interface GradedQuestionResult {
  questionId: string;
  numberLabel: string;
  prompt: string;
  maxMarks: number;
  awardedMarks: number;
  detectedAnswerText: string;
  bboxPct: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  steps: GradedStepResult[];
}

export interface ConceptXRayTrace {
  failedConcept: ConceptNode;
  rootPrerequisite: ConceptNode;
  chain: ConceptNode[];
  evidence: string;
}

export interface PaperCheckReport {
  id: string;
  rubricId: string;
  rubricTitle: string;
  engineUsed: 'On-Device OCR (Tesseract.js + Symbolic CBSE Rubric)' | 'Gemini 2.5 Flash Vision AI';
  processedAt: string;
  durationMs: number;
  totalMarks: number;
  awardedMarks: number;
  percentage: number;
  avgConfidence: number;
  flaggedStepsCount: number;
  layers: PreprocessingLayers;
  rawLines: RecognizedLine[];
  questions: GradedQuestionResult[];
  conceptXRays: ConceptXRayTrace[];
}

export interface PaperCheckProgress {
  stage: string;
  percent: number;
  detail: string;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = dataUrl;
  });
}

/**
 * STAGE 1: Real Client-Side Computer Vision Preprocessing
 * 1) Suppresses blue horizontal notebook lines and red vertical margins
 * 2) Runs adaptive Otsu-inspired thresholding to isolate dark ink under uneven lighting
 * 3) Computes horizontal ink projection bands to find answer rows
 */
export async function preprocessExamImage(imageDataUrl: string): Promise<PreprocessingLayers> {
  const img = await loadImage(imageDataUrl);
  const maxDim = 1100;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const width = Math.max(320, Math.round(img.width * scale));
  const height = Math.max(320, Math.round(img.height * scale));

  // Original normalized canvas
  const origCanvas = document.createElement('canvas');
  origCanvas.width = width;
  origCanvas.height = height;
  const origCtx = origCanvas.getContext('2d')!;
  origCtx.drawImage(img, 0, 0, width, height);
  const origImageData = origCtx.getImageData(0, 0, width, height);

  // Layer 2: Blue ruled-line & red margin suppression
  const cleanCanvas = document.createElement('canvas');
  cleanCanvas.width = width;
  cleanCanvas.height = height;
  const cleanCtx = cleanCanvas.getContext('2d')!;
  const cleanData = cleanCtx.createImageData(width, height);

  // Layer 3: High-contrast binarized ink layer
  const binCanvas = document.createElement('canvas');
  binCanvas.width = width;
  binCanvas.height = height;
  const binCtx = binCanvas.getContext('2d')!;
  const binData = binCtx.createImageData(width, height);

  const src = origImageData.data;
  const dstClean = cleanData.data;
  const dstBin = binData.data;

  const grayValues = new Uint8Array(width * height);
  const hist = new Uint32Array(256);
  let suppressedCount = 0;
  const totalPixels = width * height;

  for (let i = 0, p = 0; i < src.length; i += 4, p += 1) {
    const r = src[i];
    const g = src[i + 1];
    const b = src[i + 2];

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // Detect light red margin lines (high R, lower G/B, mid-high brightness)
    const isRedMargin = r > 150 && r - g > 38 && r - b > 38 && lum > 115;
    // Detect pale blue notebook horizontal rulings (high B, mid-high luminance — NOT dark blue ballpoint ink)
    const isBlueRule = b > 155 && b - r > 20 && lum > 148;

    let cr = r;
    let cg = g;
    let cb = b;

    if (isRedMargin || isBlueRule) {
      cr = 252;
      cg = 251;
      cb = 248;
      suppressedCount += 1;
    }

    dstClean[i] = cr;
    dstClean[i + 1] = cg;
    dstClean[i + 2] = cb;
    dstClean[i + 3] = 255;

    const cleanLum = Math.round(0.299 * cr + 0.587 * cg + 0.114 * cb);
    grayValues[p] = cleanLum;
    hist[cleanLum] += 1;
  }

  // Otsu threshold computation for clean paper-vs-ink separation
  let sumAll = 0;
  for (let t = 0; t < 256; t += 1) sumAll += t * hist[t];

  let sumB = 0;
  let wB = 0;
  let maxVar = 0;
  let threshold = 165;

  for (let t = 0; t < 256; t += 1) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = totalPixels - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sumAll - sumB) / wF;
    const betweenVar = wB * wF * (mB - mF) * (mB - mF);
    if (betweenVar > maxVar) {
      maxVar = betweenVar;
      threshold = t;
    }
  }
  // Keep threshold strictly within sensible ink bounds
  const inkCutoff = Math.min(205, Math.max(125, threshold - 6));

  // Build binarized output & row-wise ink density projection
  const rowInk = new Float32Array(height);
  for (let y = 0; y < height; y += 1) {
    let darkInRow = 0;
    for (let x = 0; x < width; x += 1) {
      const p = y * width + x;
      const i = p * 4;
      const isInk = grayValues[p] < inkCutoff;
      if (isInk) darkInRow += 1;
      const val = isInk ? 18 : 255;
      dstBin[i] = val;
      dstBin[i + 1] = val;
      dstBin[i + 2] = val;
      dstBin[i + 3] = 255;
    }
    rowInk[y] = darkInRow / width;
  }

  cleanCtx.putImageData(cleanData, 0, 0);
  binCtx.putImageData(binData, 0, 0);

  // Extract horizontal ink bands (contiguous rows with ink density > 0.45%)
  const inkBands: InkBand[] = [];
  let inBand = false;
  let bandStart = 0;
  let bandSum = 0;
  let bandRows = 0;

  for (let y = 0; y < height; y += 1) {
    const active = rowInk[y] > 0.0045;
    if (active && !inBand) {
      inBand = true;
      bandStart = y;
      bandSum = rowInk[y];
      bandRows = 1;
    } else if (active && inBand) {
      bandSum += rowInk[y];
      bandRows += 1;
    } else if (!active && inBand) {
      if (y - bandStart >= 8) {
        inkBands.push({
          yStartPct: (bandStart / height) * 100,
          yEndPct: (y / height) * 100,
          inkDensity: Number(((bandSum / bandRows) * 100).toFixed(2)),
        });
      }
      inBand = false;
    }
  }

  return {
    width,
    height,
    originalDataUrl: origCanvas.toDataURL('image/png'),
    linesRemovedDataUrl: cleanCanvas.toDataURL('image/png'),
    binarizedDataUrl: binCanvas.toDataURL('image/png'),
    inkBands,
    ruledPixelsSuppressedPct: Number(((suppressedCount / totalPixels) * 100).toFixed(1)),
  };
}

function normalizeForMatch(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[×✕]/g, 'x')
    .replace(/[–—−]/g, '-')
    .replace(/÷/g, '/')
    .replace(/2\(\s*1\s*\+\s*b\s*\)/g, '2(l + b)')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactMath(raw: string): string {
  return normalizeForMatch(raw).replace(/\s+/g, '');
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i += 1) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const temp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return dp[n];
}

function fuzzyContains(haystack: string, needle: string): boolean {
  const hNorm = normalizeForMatch(haystack);
  const nNorm = normalizeForMatch(needle);
  if (!nNorm) return false;
  if (hNorm.includes(nNorm)) return true;
  if (compactMath(hNorm).includes(compactMath(nNorm))) return true;

  // Allow 1-character OCR typo tolerance for words >= 5 chars
  if (nNorm.length >= 5 && !nNorm.includes(' ')) {
    const words = hNorm.split(/[^a-z0-9/+=.-]+/).filter(Boolean);
    for (const w of words) {
      if (Math.abs(w.length - nNorm.length) <= 1 && levenshtein(w, nNorm) <= 1) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Merges OCR fragments that share the same physical horizontal ruled line
 * (for example, when Tesseract places a left-margin "Q1." in a separate block from the equation on the same row).
 */
function mergeSameRowLines(lines: RecognizedLine[]): RecognizedLine[] {
  const sorted = [...lines].sort((a, b) => a.bboxPct.y - b.bboxPct.y || a.bboxPct.x - b.bboxPct.x);
  const rows: RecognizedLine[][] = [];

  for (const line of sorted) {
    const centerY = line.bboxPct.y + line.bboxPct.height / 2;
    const matchRow = rows.find((group) => {
      const ref = group[0];
      const refCenterY = ref.bboxPct.y + ref.bboxPct.height / 2;
      return Math.abs(centerY - refCenterY) < 2.6;
    });
    if (matchRow) {
      matchRow.push(line);
    } else {
      rows.push([line]);
    }
  }

  return rows.map((group) => {
    group.sort((a, b) => a.bboxPct.x - b.bboxPct.x);
    if (group.length === 1) return group[0];
    const minX = Math.min(...group.map((g) => g.bboxPct.x));
    const minY = Math.min(...group.map((g) => g.bboxPct.y));
    const maxX = Math.max(...group.map((g) => g.bboxPct.x + g.bboxPct.width));
    const maxY = Math.max(...group.map((g) => g.bboxPct.y + g.bboxPct.height));
    const avgConf = Math.round(group.reduce((s, g) => s + g.confidence, 0) / group.length);
    return {
      text: group.map((g) => g.text).join(' '),
      confidence: avgConf,
      bboxPct: {
        x: Number(minX.toFixed(1)),
        y: Number(minY.toFixed(1)),
        width: Number((maxX - minX).toFixed(1)),
        height: Number((maxY - minY).toFixed(1)),
      },
    };
  });
}

/**
 * Splits OCR lines into per-question blocks using explicit Q1/Q2/Q3 markers
 * (tolerant of OCR confusions like Ql/Qi/01 and left-margin splits),
 * rescuing any leading answer lines above Q2 into Q1 instead of dropping them.
 */
function partitionLinesByQuestion(
  lines: RecognizedLine[],
  questions: ExamQuestion[],
): Array<{ question: ExamQuestion; lines: RecognizedLine[] }> {
  const merged = mergeSameRowLines(lines);

  // Filter out top school-header lines (top 14% of sheet)
  const contentLines = merged.filter((line) => {
    const t = normalizeForMatch(line.text);
    const isHeaderMeta =
      line.bboxPct.y < 14 &&
      (t.includes('school') ||
        t.includes('answer sheet') ||
        t.includes('roll no') ||
        t.includes('name:') ||
        t.includes('date:'));
    return !isHeaderMeta && t.length > 0;
  });

  // Detect explicit question anchor indices (tolerant of Q1, Q.1, Ql, Qi, O1, 01, 1))
  const anchors: Array<{ qIndex: number; lineIndex: number }> = [];
  contentLines.forEach((line, idx) => {
    const norm = normalizeForMatch(line.text);
    questions.forEach((q, qIdx) => {
      const num = q.numberLabel.replace(/[^0-9]/g, '');
      const digitPattern = num === '1' ? '(?:1|l|i)' : num;
      const pattern = new RegExp(
        `(^|\\s)(?:[qo0]\\.?\\s*${digitPattern}|${num}\\)|ans\\.?\\s*${digitPattern})(?:\\.|\\b|\\s|:|$)`,
        'i',
      );
      if (pattern.test(norm) && !anchors.some((a) => a.qIndex === qIdx)) {
        anchors.push({ qIndex: qIdx, lineIndex: idx });
      }
    });
  });

  anchors.sort((a, b) => a.lineIndex - b.lineIndex);

  // Rescue leading lines above the first anchor into Q1 if Q1's margin label was missed by OCR
  if (anchors.length > 0 && !anchors.some((a) => a.qIndex === 0) && anchors[0].lineIndex > 0) {
    anchors.unshift({ qIndex: 0, lineIndex: 0 });
  }

  if (anchors.length > 0) {
    return questions.map((question, qIdx) => {
      const anchorPos = anchors.findIndex((a) => a.qIndex === qIdx);
      if (anchorPos === -1) {
        return { question, lines: [] };
      }
      const start = anchors[anchorPos].lineIndex;
      const end =
        anchorPos + 1 < anchors.length ? anchors[anchorPos + 1].lineIndex : contentLines.length;
      return { question, lines: contentLines.slice(start, end) };
    });
  }

  // Spatial fallback: divide recognized lines evenly across questions
  const chunkSize = Math.max(1, Math.ceil(contentLines.length / questions.length));
  return questions.map((question, qIdx) => ({
    question,
    lines: contentLines.slice(qIdx * chunkSize, (qIdx + 1) * chunkSize),
  }));
}

function mergeBbox(lines: RecognizedLine[], fallbackIndex: number, total: number) {
  if (lines.length === 0) {
    const slotH = 72 / Math.max(1, total);
    return {
      x: 14,
      y: 16 + fallbackIndex * slotH,
      width: 78,
      height: Math.max(12, slotH - 4),
    };
  }
  const minX = Math.max(4, Math.min(...lines.map((l) => l.bboxPct.x)) - 2);
  const minY = Math.max(4, Math.min(...lines.map((l) => l.bboxPct.y)) - 1.5);
  const maxX = Math.min(96, Math.max(...lines.map((l) => l.bboxPct.x + l.bboxPct.width)) + 2);
  const maxY = Math.min(96, Math.max(...lines.map((l) => l.bboxPct.y + l.bboxPct.height)) + 1.5);
  return {
    x: Number(minX.toFixed(1)),
    y: Number(minY.toFixed(1)),
    width: Number(Math.max(18, maxX - minX).toFixed(1)),
    height: Number(Math.max(5, maxY - minY).toFixed(1)),
  };
}

function evaluateStep(step: RubricStep, qLines: RecognizedLine[]): GradedStepResult {
  const joinedText = qLines.map((l) => l.text).join(' | ');
  const avgLineConf =
    qLines.length > 0
      ? Math.round(qLines.reduce((acc, l) => acc + l.confidence, 0) / qLines.length)
      : 55;

  // 1. Check Indian exam common misconception trap first!
  if (step.commonTrap) {
    const trapLine = qLines.find((line) =>
      step.commonTrap!.badPattern.some((pat) => fuzzyContains(line.text, pat)),
    );
    if (trapLine) {
      return {
        stepId: step.id,
        description: step.description,
        maxMarks: step.maxMarks,
        awardedMarks: 0,
        status: 'trap',
        confidence: Math.min(96, Math.max(72, Math.round(trapLine.confidence))),
        needsTeacherEye: trapLine.confidence < 78,
        matchedText: trapLine.text,
        reason: `Misconception detected (${step.commonTrap.trapName}): ${step.commonTrap.explanation}`,
        trapDetected: {
          trapName: step.commonTrap.trapName,
          explanation: step.commonTrap.explanation,
          prerequisiteConceptId: step.commonTrap.prerequisiteConceptId,
        },
        conceptId: step.conceptId,
        bboxPct: trapLine.bboxPct,
      };
    }
  }

  // 2. Match expected rubric keywords & math tokens
  let matchedLine: RecognizedLine | undefined;
  let keywordHits = 0;

  for (const kw of step.expectedKeywords) {
    const hitLine = qLines.find((l) => fuzzyContains(l.text, kw));
    if (hitLine) {
      keywordHits += 1;
      if (!matchedLine) matchedLine = hitLine;
    }
  }

  const mathHits = (step.mathTokens ?? []).filter((tok) => fuzzyContains(joinedText, tok)).length;
  const requiredMath = step.mathTokens?.length ?? 0;

  if (keywordHits > 0 && (requiredMath === 0 || mathHits >= Math.ceil(requiredMath / 2))) {
    const isStrong =
      keywordHits >= Math.min(2, step.expectedKeywords.length) ||
      (requiredMath > 0 && mathHits === requiredMath) ||
      step.expectedKeywords.some((kw) => kw.length >= 4 && fuzzyContains(joinedText, kw));

    const awarded = isStrong ? step.maxMarks : Number((step.maxMarks * 0.5).toFixed(1));
    const status = isStrong ? 'full' : 'partial';
    const conf = Math.min(98, Math.max(66, Math.round((matchedLine?.confidence ?? avgLineConf) + 4)));

    return {
      stepId: step.id,
      description: step.description,
      maxMarks: step.maxMarks,
      awardedMarks: awarded,
      status,
      confidence: conf,
      needsTeacherEye: conf < 78 || status === 'partial',
      matchedText: matchedLine?.text ?? joinedText.slice(0, 80),
      reason:
        status === 'full'
          ? 'CBSE step verified in handwritten working.'
          : 'Partial step evidence found — teacher confirmation recommended.',
      conceptId: step.conceptId,
      bboxPct: matchedLine?.bboxPct,
    };
  }

  if (mathHits > 0 && qLines.length > 0) {
    const partialMarks = Number((step.maxMarks * 0.5).toFixed(1));
    const conf = Math.max(58, Math.min(76, avgLineConf));
    return {
      stepId: step.id,
      description: step.description,
      maxMarks: step.maxMarks,
      awardedMarks: partialMarks,
      status: 'partial',
      confidence: conf,
      needsTeacherEye: true,
      matchedText: qLines[0].text,
      reason: 'Found intermediate values, but key rubric step was incomplete or unclear.',
      conceptId: step.conceptId,
      bboxPct: qLines[0].bboxPct,
    };
  }

  return {
    stepId: step.id,
    description: step.description,
    maxMarks: step.maxMarks,
    awardedMarks: 0,
    status: 'missed',
    confidence: qLines.length > 0 ? Math.max(68, avgLineConf) : 60,
    needsTeacherEye: qLines.length === 0 || avgLineConf < 78,
    matchedText: qLines.length > 0 ? '(Step not found in student response)' : '(Blank / unrecognized region)',
    reason: 'Required CBSE marking step not demonstrated in answer.',
    conceptId: step.conceptId,
    bboxPct: qLines[qLines.length - 1]?.bboxPct,
  };
}

/**
 * STAGE 5: Walk the NCERT Prerequisite Concept Graph backwards from every missed/trap step
 */
export function traceConceptXRay(questions: GradedQuestionResult[]): ConceptXRayTrace[] {
  const traces: ConceptXRayTrace[] = [];
  const seenRoots = new Set<string>();

  for (const q of questions) {
    for (const s of q.steps) {
      if (s.status === 'full') continue;
      const startConceptId = s.trapDetected?.prerequisiteConceptId ?? s.conceptId;
      const startNode = CONCEPT_GRAPH[startConceptId];
      if (!startNode) continue;

      const chain: ConceptNode[] = [startNode];
      let curr = startNode;
      while (curr.prerequisiteId && CONCEPT_GRAPH[curr.prerequisiteId]) {
        curr = CONCEPT_GRAPH[curr.prerequisiteId];
        chain.push(curr);
      }

      const root = chain[chain.length - 1];
      const traceKey = `${startNode.id}->${root.id}`;
      if (seenRoots.has(traceKey)) continue;
      seenRoots.add(traceKey);

      traces.push({
        failedConcept: CONCEPT_GRAPH[s.conceptId] ?? startNode,
        rootPrerequisite: startNode.prerequisiteId ? CONCEPT_GRAPH[startNode.id] : root,
        chain,
        evidence: `${q.numberLabel}: ${s.reason}`,
      });
    }
  }
  return traces;
}

/**
 * Optional Engine A: Live Gemini 2.5 Flash Multimodal Vision Grader
 */
async function gradeWithGeminiVision(
  apiKey: string,
  layers: PreprocessingLayers,
  rubric: ExamRubric,
  onProgress: (p: PaperCheckProgress) => void,
): Promise<{ rawLines: RecognizedLine[]; questions: GradedQuestionResult[] }> {
  onProgress({
    stage: 'Gemini Vision AI',
    percent: 58,
    detail: 'Sending cleaned sheet & CBSE step rubric to Gemini 2.5 Flash Vision...',
  });

  const base64 = layers.originalDataUrl.replace(/^data:image\/\w+;base64,/, '');
  const prompt = `You are a strict, fair Indian ${rubric.board} examiner grading a handwritten student answer sheet.
Rubric: ${JSON.stringify(rubric, null, 2)}

Read every handwritten line carefully (including math steps, signs, fractions, diagrams, or bilingual notes).
Return ONLY valid JSON matching this exact TypeScript shape:
{
  "rawLines": [{ "text": string, "confidence": number, "yPct": number }],
  "questions": [{
    "questionId": string,
    "detectedAnswerText": string,
    "yStartPct": number,
    "yEndPct": number,
    "steps": [{
      "stepId": string,
      "awardedMarks": number,
      "status": "full" | "partial" | "missed" | "trap",
      "confidence": number,
      "matchedText": string,
      "reason": string,
      "trapName": string | null
    }]
  }]
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: base64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API ${response.status}: ${errText.slice(0, 140)}`);
  }

  const data = await response.json();
  const rawJsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawJsonText) throw new Error('Gemini returned empty structured output');

  const parsed = JSON.parse(rawJsonText);
  const rawLines: RecognizedLine[] = (parsed.rawLines ?? []).map(
    (l: { text: string; confidence?: number; yPct?: number }, idx: number) => ({
      text: l.text ?? '',
      confidence: Math.round(l.confidence ?? 92),
      bboxPct: {
        x: 15,
        y: l.yPct ?? 18 + idx * 6,
        width: 74,
        height: 4.5,
      },
    }),
  );

  const questions: GradedQuestionResult[] = rubric.questions.map((q, qIdx) => {
    const aiQ = (parsed.questions ?? []).find(
      (item: { questionId: string }) => item.questionId === q.id,
    );
    const yStart = aiQ?.yStartPct ?? 16 + qIdx * 24;
    const yEnd = aiQ?.yEndPct ?? yStart + 20;

    const steps: GradedStepResult[] = q.steps.map((step, sIdx) => {
      const aiStep = (aiQ?.steps ?? []).find(
        (item: { stepId: string }) => item.stepId === step.id,
      );
      const awarded = Math.min(step.maxMarks, Math.max(0, Number(aiStep?.awardedMarks ?? 0)));
      const conf = Math.round(aiStep?.confidence ?? 90);
      const status = (aiStep?.status ?? (awarded >= step.maxMarks ? 'full' : awarded > 0 ? 'partial' : 'missed')) as GradedStepResult['status'];
      return {
        stepId: step.id,
        description: step.description,
        maxMarks: step.maxMarks,
        awardedMarks: awarded,
        status,
        confidence: conf,
        needsTeacherEye: conf < 78 || status === 'partial',
        matchedText: aiStep?.matchedText ?? '',
        reason: aiStep?.reason ?? 'Evaluated by Gemini Vision against CBSE rubric.',
        trapDetected:
          aiStep?.trapName && step.commonTrap
            ? {
                trapName: aiStep.trapName,
                explanation: step.commonTrap.explanation,
                prerequisiteConceptId: step.commonTrap.prerequisiteConceptId,
              }
            : undefined,
        conceptId: step.conceptId,
        bboxPct: {
          x: 15,
          y: Number((yStart + (sIdx * (yEnd - yStart)) / Math.max(1, q.steps.length)).toFixed(1)),
          width: 74,
          height: Number(Math.max(4.5, (yEnd - yStart) / Math.max(1, q.steps.length) - 1).toFixed(1)),
        },
      };
    });

    const awardedMarks = Number(steps.reduce((s, st) => s + st.awardedMarks, 0).toFixed(1));
    return {
      questionId: q.id,
      numberLabel: q.numberLabel,
      prompt: q.prompt,
      maxMarks: q.maxMarks,
      awardedMarks,
      detectedAnswerText: aiQ?.detectedAnswerText ?? '',
      bboxPct: {
        x: 12,
        y: yStart,
        width: 80,
        height: Math.max(12, yEnd - yStart),
      },
      steps,
    };
  });

  return { rawLines, questions };
}

/**
 * MASTER ENTRYPOINT: Runs the full end-to-end paper checking pipeline
 */
export async function checkExamPaper(options: {
  imageDataUrl: string;
  rubric: ExamRubric;
  geminiApiKey?: string;
  onProgress: (progress: PaperCheckProgress) => void;
}): Promise<PaperCheckReport> {
  const { imageDataUrl, rubric, geminiApiKey, onProgress } = options;
  const startedAt = performance.now();

  onProgress({
    stage: 'Stage 1/5 · Vision Preprocessing',
    percent: 14,
    detail: 'Removing blue notebook rulings, red margins, and normalizing ink contrast...',
  });

  const layers = await preprocessExamImage(imageDataUrl);

  let rawLines: RecognizedLine[] = [];
  let questions: GradedQuestionResult[] = [];
  let engineUsed: PaperCheckReport['engineUsed'] =
    'On-Device OCR (Tesseract.js + Symbolic CBSE Rubric)';

  const trimmedKey = geminiApiKey?.trim();
  if (trimmedKey) {
    try {
      const geminiResult = await gradeWithGeminiVision(trimmedKey, layers, rubric, onProgress);
      rawLines = geminiResult.rawLines;
      questions = geminiResult.questions;
      engineUsed = 'Gemini 2.5 Flash Vision AI';
    } catch (err) {
      onProgress({
        stage: 'Fallback to Offline OCR',
        percent: 42,
        detail: `Gemini call failed (${err instanceof Error ? err.message : 'network'}). Switching to on-device Tesseract OCR...`,
      });
    }
  }

  if (questions.length === 0) {
    onProgress({
      stage: 'Stage 2/5 · On-Device OCR Engine',
      percent: 32,
      detail: 'Loading WebAssembly OCR worker and scanning handwritten ink lines...',
    });

    const worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text' && typeof m.progress === 'number') {
          onProgress({
            stage: 'Stage 3/5 · Reading Ink & Coordinates',
            percent: Math.round(35 + m.progress * 42),
            detail: `Extracting words & bounding boxes (${Math.round(m.progress * 100)}%)...`,
          });
        }
      },
    });

    try {
      // Run OCR on the cleaned lines-removed canvas (keeps natural anti-aliased strokes without blue/red ruling clutter)
      const ocrResult = await worker.recognize(layers.linesRemovedDataUrl, {}, { blocks: true });

      const extractedLines: RecognizedLine[] = [];
      const blocks = ocrResult.data.blocks ?? [];
      for (const block of blocks) {
        for (const para of block.paragraphs ?? []) {
          for (const line of para.lines ?? []) {
            const cleanText = (line.text ?? '').replace(/\s+/g, ' ').trim();
            if (!cleanText) continue;
            extractedLines.push({
              text: cleanText,
              confidence: Math.round(line.confidence ?? 75),
              bboxPct: {
                x: Number(((line.bbox.x0 / layers.width) * 100).toFixed(1)),
                y: Number(((line.bbox.y0 / layers.height) * 100).toFixed(1)),
                width: Number((((line.bbox.x1 - line.bbox.x0) / layers.width) * 100).toFixed(1)),
                height: Number((((line.bbox.y1 - line.bbox.y0) / layers.height) * 100).toFixed(1)),
              },
            });
          }
        }
      }

      // Fallback if blocks weren't populated
      if (extractedLines.length === 0 && ocrResult.data.text.trim()) {
        const split = ocrResult.data.text
          .split('\n')
          .map((t) => t.trim())
          .filter(Boolean);
        split.forEach((txt, idx) => {
          extractedLines.push({
            text: txt,
            confidence: Math.round(ocrResult.data.confidence ?? 74),
            bboxPct: {
              x: 15,
              y: Number((16 + idx * 6.5).toFixed(1)),
              width: 72,
              height: 5,
            },
          });
        });
      }

      rawLines = extractedLines;
    } finally {
      await worker.terminate();
    }

    onProgress({
      stage: 'Stage 4/5 · CBSE Step-Wise Rubric Grading',
      percent: 84,
      detail: 'Evaluating partial steps, checking sign/LCM traps, and scoring confidence...',
    });

    const partitioned = partitionLinesByQuestion(rawLines, rubric.questions);

    questions = partitioned.map(({ question, lines: qLines }, qIdx) => {
      const steps = question.steps.map((step) => evaluateStep(step, qLines));
      const awardedMarks = Number(
        Math.min(
          question.maxMarks,
          steps.reduce((sum, st) => sum + st.awardedMarks, 0),
        ).toFixed(1),
      );
      return {
        questionId: question.id,
        numberLabel: question.numberLabel,
        prompt: question.prompt,
        maxMarks: question.maxMarks,
        awardedMarks,
        detectedAnswerText: qLines.map((l) => l.text).join('\n') || '(No answer text detected)',
        bboxPct: mergeBbox(qLines, qIdx, partitioned.length),
        steps,
      };
    });
  }

  onProgress({
    stage: 'Stage 5/5 · NCERT Concept X-Ray',
    percent: 96,
    detail: 'Tracing lost marks backward to foundational grade prerequisites...',
  });

  const conceptXRays = traceConceptXRay(questions);
  const awardedMarks = Number(questions.reduce((s, q) => s + q.awardedMarks, 0).toFixed(1));
  const totalMarks = rubric.totalMarks;
  const allSteps = questions.flatMap((q) => q.steps);
  const avgConfidence =
    allSteps.length > 0
      ? Math.round(allSteps.reduce((s, st) => s + st.confidence, 0) / allSteps.length)
      : 0;
  const flaggedStepsCount = allSteps.filter((st) => st.needsTeacherEye).length;

  onProgress({
    stage: 'Complete',
    percent: 100,
    detail: 'Paper checked and mapped to CBSE steps & NCERT prerequisites.',
  });

  return {
    id: `chk-${Date.now()}`,
    rubricId: rubric.id,
    rubricTitle: rubric.title,
    engineUsed,
    processedAt: new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    durationMs: Math.round(performance.now() - startedAt),
    totalMarks,
    awardedMarks,
    percentage: Math.round((awardedMarks / Math.max(1, totalMarks)) * 100),
    avgConfidence,
    flaggedStepsCount,
    layers,
    rawLines,
    questions,
    conceptXRays,
  };
}
