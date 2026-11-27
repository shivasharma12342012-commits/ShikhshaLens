import { useEffect, useRef, useState } from 'react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Button } from '@astryxdesign/core/Button';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Eraser, Check, PenTool } from 'lucide-react';
import type { PaperCheckReport } from '../engine/paperChecker';

interface PaperCanvasOverlayProps {
  imageDataUrl: string;
  report: PaperCheckReport | null;
  showAnnotations: boolean;
  layerMode: 'original' | 'cleaned' | 'binarized';
  hoveredStepId: string | null;
  onHoverStep: (stepId: string | null) => void;
}

export function PaperCanvasOverlay({
  imageDataUrl,
  report,
  showAnnotations,
  layerMode,
  hoveredStepId,
  onHoverStep,
}: PaperCanvasOverlayProps) {
  const displaySrc =
    report && layerMode === 'cleaned'
      ? report.layers.linesRemovedDataUrl
      : report && layerMode === 'binarized'
        ? report.layers.binarizedDataUrl
        : imageDataUrl;

  return (
    <VStack className="sl-paper-stage">
      <img src={displaySrc} alt="Scanned student exam answer sheet" />

      {report && showAnnotations ? (
        <svg
          className="sl-overlay-svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-label="Graded step annotations overlay"
        >
          {report.questions.map((q) => {
            const hasIssue = q.awardedMarks < q.maxMarks;
            const boxColor = hasIssue ? '#B8432E' : '#1E7E4C';

            return (
              <g key={q.questionId}>
                {/* Question bounding region */}
                <rect
                  x={q.bboxPct.x}
                  y={q.bboxPct.y}
                  width={q.bboxPct.width}
                  height={q.bboxPct.height}
                  rx="0.8"
                  fill={hasIssue ? 'rgba(184, 67, 46, 0.045)' : 'rgba(30, 126, 76, 0.045)'}
                  stroke={boxColor}
                  strokeWidth="0.32"
                  strokeDasharray={hasIssue ? '1.1 0.6' : undefined}
                />

                {/* Red-pen / sage-pen score callout pinned cleanly in the right empty margin */}
                <rect
                  x="84.5"
                  y={Math.max(1.2, q.bboxPct.y - 0.4)}
                  width="13.5"
                  height="3.2"
                  rx="0.6"
                  fill={boxColor}
                />
                <text
                  x="91.25"
                  y={Math.max(1.2, q.bboxPct.y - 0.4) + 2.25}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="1.85"
                  fontFamily="IBM Plex Mono, monospace"
                  fontWeight="500"
                >
                  {q.numberLabel}: {q.awardedMarks}/{q.maxMarks}
                </text>

                {/* Individual step highlight boxes */}
                {q.steps.map((step) => {
                  if (!step.bboxPct) return null;
                  const isHovered = hoveredStepId === step.stepId;
                  const stepStroke =
                    step.status === 'full'
                      ? '#1E7E4C'
                      : step.status === 'partial'
                        ? '#B4690E'
                        : '#B8432E';
                  return (
                    <rect
                      key={step.stepId}
                      className="sl-overlay-hit"
                      x={step.bboxPct.x}
                      y={step.bboxPct.y}
                      width={step.bboxPct.width}
                      height={step.bboxPct.height}
                      rx="0.5"
                      fill={isHovered ? `${stepStroke}26` : 'transparent'}
                      stroke={stepStroke}
                      strokeWidth={isHovered ? '0.48' : '0.2'}
                      opacity={hoveredStepId && !isHovered ? 0.35 : 0.95}
                      onMouseEnter={() => onHoverStep(step.stepId)}
                      onMouseLeave={() => onHoverStep(null)}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      ) : null}
    </VStack>
  );
}

interface LiveHandwritingPadProps {
  onCaptureCanvas: (dataUrl: string) => void;
  onCancel: () => void;
}

export function LiveHandwritingPad({ onCaptureCanvas, onCancel }: LiveHandwritingPadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);

  const initRuledPaper = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FBF8F1';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Ruled blue lines
    ctx.strokeStyle = 'rgba(92, 146, 212, 0.38)';
    ctx.lineWidth = 1.4;
    for (let y = 76; y < canvas.height - 24; y += 58) {
      ctx.beginPath();
      ctx.moveTo(24, y);
      ctx.lineTo(canvas.width - 24, y);
      ctx.stroke();
    }

    // Double red margin
    ctx.strokeStyle = 'rgba(201, 78, 66, 0.55)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(106, 24);
    ctx.lineTo(106, canvas.height - 24);
    ctx.moveTo(112, 24);
    ctx.lineTo(112, canvas.height - 24);
    ctx.stroke();
  };

  useEffect(() => {
    if (canvasRef.current) initRuledPaper(canvasRef.current);
  }, []);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(e.pointerId);
    const { x, y } = getPoint(e);
    ctx.strokeStyle = '#18366B';
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setStrokeCount((c) => c + 1);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPoint(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  return (
    <VStack gap={3}>
      <HStack justify="between" align="center" wrap="wrap" gap={2}>
        <HStack gap={2} align="center">
          <PenTool size={16} strokeWidth={1.5} />
          <Text weight="medium">Live ruled-paper pad</Text>
          <Badge label="Draw or write Q1 steps" variant="neutral" />
        </HStack>
        <HStack gap={2}>
          <Button
            label="Clear sheet"
            variant="secondary"
            size="sm"
            icon={<Eraser size={16} strokeWidth={1.5} />}
            onClick={() => {
              if (canvasRef.current) initRuledPaper(canvasRef.current);
              setStrokeCount(0);
            }}
          />
          <Button label="Cancel" variant="ghost" size="sm" onClick={onCancel} />
          <Button
            label="Use this sheet"
            variant="primary"
            size="sm"
            isDisabled={strokeCount === 0}
            icon={<Check size={16} strokeWidth={1.5} />}
            onClick={() => {
              if (canvasRef.current) onCaptureCanvas(canvasRef.current.toDataURL('image/png'));
            }}
          />
        </HStack>
      </HStack>

      <canvas
        ref={canvasRef}
        width={920}
        height={640}
        className="sl-scratchpad"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      <Text type="supporting" color="secondary">
        Tip: Write large, spaced lines like &ldquo;Q1 3x - 12 = 15&rdquo; and &ldquo;3x = 15 + 12 = 27&rdquo;, then click &ldquo;Use this sheet&rdquo; to run real OCR + CBSE step checking on your own handwriting.
      </Text>
    </VStack>
  );
}
