import { useEffect, useRef, useState } from 'react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Section } from '@astryxdesign/core/Section';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Selector } from '@astryxdesign/core/Selector';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { Divider } from '@astryxdesign/core/Divider';
import { Banner } from '@astryxdesign/core/Banner';
import { Popover } from '@astryxdesign/core/Popover';
import { Switch } from '@astryxdesign/core/Switch';
import {
  ScanLine,
  Upload,
  Camera,
  PenTool,
  SlidersHorizontal,
  Eye,
  Check,
  Minus,
  Plus,
  Cpu,
  GitBranch,
  CheckCheck,
} from 'lucide-react';
import {
  CONCEPT_GRAPH,
  type ExamRubric,
  type StudentRecord,
} from '../data/schoolData';
import {
  SAMPLE_EXAM_SHEETS,
  renderSampleExamSheetToDataUrl,
} from '../engine/examSheetRenderer';
import {
  checkExamPaper,
  traceConceptXRay,
  type PaperCheckProgress,
  type PaperCheckReport,
} from '../engine/paperChecker';
import { LiveHandwritingPad, PaperCanvasOverlay } from '../components/PaperCanvasOverlay';
import { RubricDialog } from '../components/RubricDialog';
import { PipelineInspectorDrawer } from '../components/PipelineInspectorDrawer';

interface PaperStudioViewProps {
  students: StudentRecord[];
  rubrics: ExamRubric[];
  geminiApiKey: string;
  onUpdateRubric: (rubric: ExamRubric) => void;
  onCommitGrade: (studentId: string, report: PaperCheckReport) => void;
  onOpenSettings: () => void;
}

export function PaperStudioView({
  students,
  rubrics,
  geminiApiKey,
  onUpdateRubric,
  onCommitGrade,
  onOpenSettings,
}: PaperStudioViewProps) {
  const [selectedSampleId, setSelectedSampleId] = useState(SAMPLE_EXAM_SHEETS[0].id);
  const [selectedStudentId, setSelectedStudentId] = useState(SAMPLE_EXAM_SHEETS[0].studentId);
  const [selectedRubricId, setSelectedRubricId] = useState(SAMPLE_EXAM_SHEETS[0].rubricId);
  const [imageDataUrl, setImageDataUrl] = useState<string>('');
  const [sheetSourceLabel, setSheetSourceLabel] = useState<string>(SAMPLE_EXAM_SHEETS[0].shortLabel);

  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
  const [isRubricOpen, setIsRubricOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  const [isChecking, setIsChecking] = useState(false);
  const [progress, setProgress] = useState<PaperCheckProgress | null>(null);
  const [report, setReport] = useState<PaperCheckReport | null>(null);
  const [committedReportId, setCommittedReportId] = useState<string | null>(null);

  const [showAnnotations, setShowAnnotations] = useState(true);
  const [layerMode, setLayerMode] = useState<'original' | 'cleaned' | 'binarized'>('original');
  const [hoveredStepId, setHoveredStepId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const activeRubric = rubrics.find((r) => r.id === selectedRubricId) ?? rubrics[0];

  useEffect(() => {
    const sample = SAMPLE_EXAM_SHEETS.find((s) => s.id === selectedSampleId);
    if (!sample) return;
    const url = renderSampleExamSheetToDataUrl(sample);
    setImageDataUrl(url);
    setSheetSourceLabel(sample.shortLabel);
    setSelectedStudentId(sample.studentId);
    setSelectedRubricId(sample.rubricId);
    setReport(null);
    setCommittedReportId(null);
    setLayerMode('original');
  }, [selectedSampleId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageDataUrl(reader.result);
        setSheetSourceLabel(file.name);
        setReport(null);
        setCommittedReportId(null);
        setIsScratchpadOpen(false);
        setLayerMode('original');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRunPaperCheck = async () => {
    if (!imageDataUrl || isChecking) return;
    setIsChecking(true);
    setCommittedReportId(null);
    try {
      const result = await checkExamPaper({
        imageDataUrl,
        rubric: activeRubric,
        geminiApiKey,
        onProgress: setProgress,
      });
      setReport(result);
    } finally {
      setIsChecking(false);
    }
  };

  const adjustStepMarks = (questionId: string, stepId: string, delta: number) => {
    if (!report) return;
    const nextQuestions = report.questions.map((q) => {
      if (q.questionId !== questionId) return q;
      const nextSteps = q.steps.map((s) => {
        if (s.stepId !== stepId) return s;
        const nextAward = Number(
          Math.min(s.maxMarks, Math.max(0, s.awardedMarks + delta)).toFixed(1),
        );
        const nextStatus: typeof s.status =
          nextAward >= s.maxMarks ? 'full' : nextAward > 0 ? 'partial' : s.trapDetected ? 'trap' : 'missed';
        return {
          ...s,
          awardedMarks: nextAward,
          status: nextStatus,
          needsTeacherEye: false,
          teacherOverridden: true,
        };
      });
      const qAward = Number(nextSteps.reduce((acc, st) => acc + st.awardedMarks, 0).toFixed(1));
      return { ...q, awardedMarks: qAward, steps: nextSteps };
    });

    const totalAwarded = Number(
      nextQuestions.reduce((acc, q) => acc + q.awardedMarks, 0).toFixed(1),
    );
    const allSteps = nextQuestions.flatMap((q) => q.steps);
    setReport({
      ...report,
      questions: nextQuestions,
      awardedMarks: totalAwarded,
      percentage: Math.round((totalAwarded / Math.max(1, report.totalMarks)) * 100),
      flaggedStepsCount: allSteps.filter((st) => st.needsTeacherEye).length,
      conceptXRays: traceConceptXRay(nextQuestions),
    });
  };

  const approveAllHighConfidence = () => {
    if (!report) return;
    const nextQuestions = report.questions.map((q) => ({
      ...q,
      steps: q.steps.map((s) => ({ ...s, needsTeacherEye: false })),
    }));
    setReport({
      ...report,
      questions: nextQuestions,
      flaggedStepsCount: 0,
    });
  };

  const selectedStudent = students.find((s) => s.id === selectedStudentId) ?? students[0];

  return (
    <VStack gap={5} padding={6} maxWidth={1480}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Page Header — one primary CTA */}
      <HStack justify="between" align="end" wrap="wrap" gap={3}>
        <VStack gap={1}>
          <Heading level={1} weight="medium">
            Paper Studio
          </Heading>
          <Text color="secondary">
            Grade handwritten Indian answer sheets step by step and trace lost marks to NCERT prerequisites
          </Text>
        </VStack>

        <HStack gap={2} wrap="wrap">
          <Button
            label="How paper checking works"
            variant="secondary"
            icon={<Cpu size={16} strokeWidth={1.5} />}
            onClick={() => setIsInspectorOpen(true)}
          />
          <Button
            label="Edit rubric"
            variant="secondary"
            icon={<SlidersHorizontal size={16} strokeWidth={1.5} />}
            onClick={() => setIsRubricOpen(true)}
          />
          <Button
            label={isChecking ? 'Checking paper' : 'Check paper now'}
            variant="primary"
            isLoading={isChecking}
            isDisabled={!imageDataUrl || isScratchpadOpen}
            icon={<ScanLine size={16} strokeWidth={1.5} />}
            onClick={handleRunPaperCheck}
          />
        </HStack>
      </HStack>

      {/* Structured 4-Column Control Strip — zero wrapping or truncation */}
      <Section variant="muted" padding={4} dividers={['top', 'bottom']}>
        <Grid columns={{ minWidth: 200, max: 4 }} gap={3} align="end">
          <Selector
            label="Exam sheet"
            value={selectedSampleId}
            onChange={(val) => {
              if (val) {
                setSelectedSampleId(val);
                setIsScratchpadOpen(false);
              }
            }}
            options={SAMPLE_EXAM_SHEETS.map((s) => ({
              value: s.id,
              label: s.shortLabel,
              description: s.subtitle,
            }))}
            width="100%"
          />

          <Selector
            label="Student"
            value={selectedStudentId}
            onChange={(val) => val && setSelectedStudentId(val)}
            options={students.map((st) => ({
              value: st.id,
              label: `Roll ${st.rollNo} · ${st.name}`,
              description: `${st.className} · ${st.parentLanguage}`,
            }))}
            width="100%"
          />

          <Selector
            label="Marking scheme"
            value={selectedRubricId}
            onChange={(val) => {
              if (val) {
                setSelectedRubricId(val);
                setReport(null);
              }
            }}
            options={rubrics.map((r) => ({
              value: r.id,
              label: `${r.className} ${r.subject}`,
              description: `${r.board} · ${r.totalMarks} marks`,
            }))}
            width="100%"
          />

          <Popover
            label="Capture or upload sheet"
            padding={2}
            content={
              <VStack gap={1} width={220}>
                <Button
                  label="Upload exam photo"
                  variant="ghost"
                  size="sm"
                  width="100%"
                  icon={<Upload size={16} strokeWidth={1.5} />}
                  onClick={() => fileInputRef.current?.click()}
                />
                <Button
                  label="Use camera"
                  variant="ghost"
                  size="sm"
                  width="100%"
                  icon={<Camera size={16} strokeWidth={1.5} />}
                  onClick={() => cameraInputRef.current?.click()}
                />
                <Button
                  label="Write on live paper pad"
                  variant="ghost"
                  size="sm"
                  width="100%"
                  icon={<PenTool size={16} strokeWidth={1.5} />}
                  onClick={() => {
                    setIsScratchpadOpen(true);
                    setReport(null);
                  }}
                />
              </VStack>
            }
          >
            <Button
              label="Upload or write sheet"
              variant="secondary"
              width="100%"
              icon={<Upload size={16} strokeWidth={1.5} />}
            />
          </Popover>
        </Grid>
      </Section>

      {/* Progress Indicator during live CV + OCR run */}
      {isChecking && progress ? (
        <Card padding={4} variant="default">
          <VStack gap={2}>
            <HStack justify="between" align="center">
              <Text weight="medium">{progress.stage}</Text>
              <Text type="supporting" color="secondary" className="sl-mono">
                {progress.percent}%
              </Text>
            </HStack>
            <ProgressBar
              label={progress.stage}
              isLabelHidden
              value={progress.percent}
              max={100}
              variant="accent"
            />
            <Text type="supporting" color="secondary">
              {progress.detail}
            </Text>
          </VStack>
        </Card>
      ) : null}

      {/* Stable Side-by-Side Workspace Split (Sticky Paper Canvas on Left + Graded Steps on Right) */}
      <VStack className="sl-split-workspace">
        {/* LEFT PANE: Sticky Scanned Exam Sheet */}
        <VStack gap={3} className="sl-sticky-paper">
          <HStack justify="between" align="center" wrap="wrap" gap={2}>
            <VStack gap={0.5}>
              <Text weight="medium">{sheetSourceLabel}</Text>
              <Text type="supporting" color="secondary">
                {geminiApiKey.trim()
                  ? 'Gemini 2.5 Flash Vision'
                  : 'On-device Canvas CV and Tesseract OCR'}
              </Text>
            </VStack>

            {report ? (
              <HStack gap={3} align="center" wrap="wrap">
                <SegmentedControl
                  label="Vision preprocessing layer"
                  value={layerMode}
                  onChange={(val) => setLayerMode(val as 'original' | 'cleaned' | 'binarized')}
                  size="sm"
                >
                  <SegmentedControlItem value="original" label="Paper" />
                  <SegmentedControlItem value="cleaned" label="No rules" />
                  <SegmentedControlItem value="binarized" label="Ink mask" />
                </SegmentedControl>
                <Switch
                  label="Overlay"
                  value={showAnnotations}
                  onChange={setShowAnnotations}
                  size="sm"
                />
              </HStack>
            ) : null}
          </HStack>

          {isScratchpadOpen ? (
            <Card padding={4} variant="default">
              <LiveHandwritingPad
                onCaptureCanvas={(dataUrl) => {
                  setImageDataUrl(dataUrl);
                  setSheetSourceLabel('Handwritten pad');
                  setIsScratchpadOpen(false);
                  setReport(null);
                }}
                onCancel={() => setIsScratchpadOpen(false)}
              />
            </Card>
          ) : imageDataUrl ? (
            <PaperCanvasOverlay
              imageDataUrl={imageDataUrl}
              report={report}
              showAnnotations={showAnnotations}
              layerMode={layerMode}
              hoveredStepId={hoveredStepId}
              onHoverStep={setHoveredStepId}
            />
          ) : null}

          {report ? (
            <HStack justify="between" align="center" wrap="wrap" gap={2}>
              <Text type="supporting" color="secondary" className="sl-mono">
                {report.durationMs} ms · {report.rawLines.length} lines ·{' '}
                {report.layers.ruledPixelsSuppressedPct}% rule pixels filtered
              </Text>
              <Button
                label="Inspect vision pipeline"
                variant="ghost"
                size="sm"
                icon={<Eye size={16} strokeWidth={1.5} />}
                onClick={() => setIsInspectorOpen(true)}
              />
            </HStack>
          ) : (
            <HStack justify="between" align="center" wrap="wrap" gap={2}>
              <Text type="supporting" color="secondary">
                Select Check paper now to filter blue rules and grade every step
              </Text>
              <Button
                label="Configure Vision API"
                variant="ghost"
                size="sm"
                onClick={onOpenSettings}
              />
            </HStack>
          )}
        </VStack>

        {/* RIGHT PANE: CBSE Rubric Readiness or Live Graded Breakdown */}
        <VStack gap={4} className="sl-pane-min">
          {!report ? (
            <Card padding={5} variant="default">
              <VStack gap={4}>
                <VStack gap={1} className="sl-margin-rule">
                  <Heading level={3} weight="medium">
                    {selectedStudent.name} · {activeRubric.title}
                  </Heading>
                  <Text color="secondary">
                    {activeRubric.board} step-wise marking scheme · {activeRubric.totalMarks} total marks across{' '}
                    {activeRubric.questions.length} questions
                  </Text>
                </VStack>

                <Divider />

                <VStack gap={3}>
                  {activeRubric.questions.map((q) => (
                    <VStack key={q.id} gap={1}>
                      <HStack justify="between" align="start" gap={2}>
                        <Text weight="medium">
                          {q.numberLabel}. {q.prompt}
                        </Text>
                        <Text type="supporting" color="secondary" className="sl-mono">
                          {q.maxMarks}m
                        </Text>
                      </HStack>
                      <Text type="supporting" color="secondary">
                        {q.steps.length} steps ({q.steps.map((s) => `${s.maxMarks}m`).join(' + ')})
                      </Text>
                    </VStack>
                  ))}
                </VStack>

                <Divider />

                <HStack justify="between" align="center" wrap="wrap" gap={2}>
                  <Text type="supporting" color="secondary">
                    Automatic trap detection active for sign flips and unlike denominators
                  </Text>
                  <Button
                    label="Inspect 5-stage pipeline"
                    variant="secondary"
                    size="sm"
                    icon={<Cpu size={16} strokeWidth={1.5} />}
                    onClick={() => setIsInspectorOpen(true)}
                  />
                </HStack>
              </VStack>
            </Card>
          ) : (
            <VStack gap={4}>
              {/* Compact Numbers-Only Stat Strip */}
              <Grid columns={{ minWidth: 130, max: 3 }} gap={3}>
                <Card padding={4} variant="default">
                  <VStack gap={1}>
                    <Text type="supporting" color="secondary">
                      Step-wise score
                    </Text>
                    <Heading level={2} weight="medium" className="sl-tabular">
                      {report.awardedMarks} / {report.totalMarks}
                    </Heading>
                    <Text type="supporting" color="secondary" className="sl-tabular">
                      {report.percentage}% ({activeRubric.board} partial credit)
                    </Text>
                  </VStack>
                </Card>

                <Card padding={4} variant="default">
                  <VStack gap={1}>
                    <Text type="supporting" color="secondary">
                      OCR confidence
                    </Text>
                    <Heading level={2} weight="medium" className="sl-tabular">
                      {report.avgConfidence}%
                    </Heading>
                    <Text type="supporting" color="secondary" className="sl-tabular">
                      {report.rawLines.length} lines recognized
                    </Text>
                  </VStack>
                </Card>

                <Card padding={4} variant="default">
                  <VStack gap={1}>
                    <Text type="supporting" color="secondary">
                      Teacher Eye queue
                    </Text>
                    <Heading level={2} weight="medium" className="sl-tabular">
                      {report.flaggedStepsCount}
                    </Heading>
                    <Text type="supporting" color="secondary">
                      {report.flaggedStepsCount === 0 ? 'All steps verified' : 'Steps below 78% conf.'}
                    </Text>
                  </VStack>
                </Card>
              </Grid>

              {/* Review Action Strip */}
              {committedReportId === report.id ? (
                <Banner
                  status="success"
                  title={`Saved to ${selectedStudent.name}'s register`}
                  description="Class 7B Concept Heatmap, TaRL tier, NEP Holistic Progress Card, and Parent Voice Bridge updated"
                />
              ) : (
                <HStack justify="between" align="center" wrap="wrap" gap={2}>
                  <HStack gap={2} align="center">
                    <StatusDot
                      variant={report.flaggedStepsCount > 0 ? 'warning' : 'success'}
                      label={report.flaggedStepsCount > 0 ? 'Review needed' : 'Ready to commit'}
                    />
                    <Text type="supporting" color="secondary">
                      {report.flaggedStepsCount > 0
                        ? `${report.flaggedStepsCount} step(s) flagged for quick verification`
                        : 'Ready to commit to register and HPC'}
                    </Text>
                  </HStack>

                  <HStack gap={2}>
                    {report.flaggedStepsCount > 0 ? (
                      <Button
                        label="Approve all"
                        variant="secondary"
                        size="sm"
                        icon={<CheckCheck size={16} strokeWidth={1.5} />}
                        onClick={approveAllHighConfidence}
                      />
                    ) : null}
                    <Button
                      label="Commit to register"
                      variant="primary"
                      size="sm"
                      icon={<Check size={16} strokeWidth={1.5} />}
                      onClick={() => {
                        onCommitGrade(selectedStudent.id, report);
                        setCommittedReportId(report.id);
                      }}
                    />
                  </HStack>
                </HStack>
              )}

              {/* NCERT Concept X-Ray */}
              <Card padding={4} variant="muted">
                <VStack gap={3}>
                  <HStack justify="between" align="center">
                    <HStack gap={2} align="center">
                      <GitBranch size={16} strokeWidth={1.5} />
                      <Heading level={4} weight="medium">
                        NCERT Concept X-Ray
                      </Heading>
                    </HStack>
                    <Text type="supporting" color="secondary" className="sl-mono">
                      {report.conceptXRays.length === 0
                        ? '0 gaps'
                        : `${report.conceptXRays.length} root gap${report.conceptXRays.length > 1 ? 's' : ''}`}
                    </Text>
                  </HStack>

                  {report.conceptXRays.length === 0 ? (
                    <Text type="supporting" color="secondary">
                      All steps demonstrated cleanly. Student ready for Challenge-tier extension sums
                    </Text>
                  ) : (
                    report.conceptXRays.map((trace, i) => (
                      <VStack key={i} gap={1} className="sl-margin-rule">
                        <HStack gap={2} align="center" wrap="wrap">
                          <Text weight="medium">{trace.failedConcept.name}</Text>
                          <Text type="supporting" color="secondary">
                            ← {trace.rootPrerequisite.grade}: {trace.rootPrerequisite.name}
                          </Text>
                        </HStack>
                        <Text type="supporting" color="secondary">
                          {trace.evidence}
                        </Text>
                        <Text type="supporting">
                          Next-day fix: {trace.rootPrerequisite.remediationTipEn}
                        </Text>
                      </VStack>
                    ))
                  )}
                </VStack>
              </Card>

              {/* Step-by-Step Question Breakdown */}
              <VStack gap={3}>
                {report.questions.map((q) => (
                  <Card key={q.questionId} padding={4} variant="default">
                    <VStack gap={3}>
                      <HStack justify="between" align="start" gap={2}>
                        <VStack gap={1} className="sl-pane-min">
                          <Text weight="medium">
                            {q.numberLabel}. {q.prompt}
                          </Text>
                          <Text type="code" color="secondary" wordBreak="break-word">
                            Read: {q.detectedAnswerText.replace(/\n/g, '  |  ')}
                          </Text>
                        </VStack>
                        <Text weight="semibold" className="sl-mono" style={{ whiteSpace: 'nowrap' }}>
                          {q.awardedMarks} / {q.maxMarks}
                        </Text>
                      </HStack>

                      <Divider />

                      <VStack gap={2}>
                        {q.steps.map((step) => {
                          const concept = CONCEPT_GRAPH[step.conceptId];
                          const isHovered = hoveredStepId === step.stepId;
                          return (
                            <VStack
                              key={step.stepId}
                              gap={1.5}
                              padding={3}
                              className="sl-step-row"
                              data-hovered={isHovered ? 'true' : 'false'}
                              data-flagged={step.needsTeacherEye ? 'true' : 'false'}
                              onMouseEnter={() => setHoveredStepId(step.stepId)}
                              onMouseLeave={() => setHoveredStepId(null)}
                            >
                              <HStack justify="between" align="start" gap={3}>
                                <VStack gap={1} className="sl-pane-min">
                                  <HStack gap={2} align="center">
                                    <StatusDot
                                      variant={
                                        step.status === 'full'
                                          ? 'success'
                                          : step.status === 'partial'
                                            ? 'warning'
                                            : 'error'
                                      }
                                      label={step.status}
                                    />
                                    <Text weight="medium">{step.description}</Text>
                                  </HStack>
                                  <Text type="supporting" color="secondary">
                                    {step.reason}
                                  </Text>
                                  <HStack gap={2} align="center" wrap="wrap">
                                    <Text type="supporting" color="secondary" className="sl-mono">
                                      Conf. {step.confidence}%
                                    </Text>
                                    {concept ? (
                                      <Text type="supporting" color="secondary">
                                        · {concept.grade} {concept.name}
                                      </Text>
                                    ) : null}
                                    {step.needsTeacherEye ? (
                                      <Badge label="Review" variant="warning" />
                                    ) : null}
                                    {step.teacherOverridden ? (
                                      <Badge label="Edited" variant="info" />
                                    ) : null}
                                  </HStack>
                                </VStack>

                                <HStack gap={1} align="center">
                                  <Button
                                    label="Decrease step marks"
                                    variant="secondary"
                                    size="sm"
                                    isIconOnly
                                    isDisabled={step.awardedMarks <= 0}
                                    icon={<Minus size={16} strokeWidth={1.5} />}
                                    onClick={() => adjustStepMarks(q.questionId, step.stepId, -0.5)}
                                  />
                                  <Text
                                    weight="medium"
                                    className="sl-mono"
                                    style={{ minWidth: 48, textAlign: 'center' }}
                                  >
                                    {step.awardedMarks}/{step.maxMarks}
                                  </Text>
                                  <Button
                                    label="Increase step marks"
                                    variant="secondary"
                                    size="sm"
                                    isIconOnly
                                    isDisabled={step.awardedMarks >= step.maxMarks}
                                    icon={<Plus size={16} strokeWidth={1.5} />}
                                    onClick={() => adjustStepMarks(q.questionId, step.stepId, 0.5)}
                                  />
                                </HStack>
                              </HStack>
                            </VStack>
                          );
                        })}
                      </VStack>
                    </VStack>
                  </Card>
                ))}
              </VStack>
            </VStack>
          )}
        </VStack>
      </VStack>

      <RubricDialog
        isOpen={isRubricOpen}
        onOpenChange={setIsRubricOpen}
        rubric={activeRubric}
        onUpdateRubric={onUpdateRubric}
      />

      <PipelineInspectorDrawer
        isOpen={isInspectorOpen}
        onOpenChange={setIsInspectorOpen}
        report={report}
      />
    </VStack>
  );
}
