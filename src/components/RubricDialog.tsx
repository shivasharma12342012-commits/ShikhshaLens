import { useState } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { Badge } from '@astryxdesign/core/Badge';
import { Plus, Trash2 } from 'lucide-react';
import type { ExamRubric } from '../data/schoolData';

interface RubricDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  rubric: ExamRubric;
  onUpdateRubric: (updated: ExamRubric) => void;
}

export function RubricDialog({
  isOpen,
  onOpenChange,
  rubric,
  onUpdateRubric,
}: RubricDialogProps) {
  const [draft, setDraft] = useState<ExamRubric>(rubric);

  const handleOpenChange = (open: boolean) => {
    if (open) setDraft(structuredClone(rubric));
    onOpenChange(open);
  };

  const updateStepKeyword = (qIdx: number, sIdx: number, csv: string) => {
    const next = structuredClone(draft);
    next.questions[qIdx].steps[sIdx].expectedKeywords = csv
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    setDraft(next);
  };

  const updateStepDescription = (qIdx: number, sIdx: number, desc: string) => {
    const next = structuredClone(draft);
    next.questions[qIdx].steps[sIdx].description = desc;
    setDraft(next);
  };

  const updateStepMarks = (qIdx: number, sIdx: number, val: string) => {
    const num = Math.max(0.5, Number(val) || 0.5);
    const next = structuredClone(draft);
    next.questions[qIdx].steps[sIdx].maxMarks = num;
    next.questions[qIdx].maxMarks = Number(
      next.questions[qIdx].steps.reduce((acc, s) => acc + s.maxMarks, 0).toFixed(1),
    );
    next.totalMarks = Number(
      next.questions.reduce((acc, q) => acc + q.maxMarks, 0).toFixed(1),
    );
    setDraft(next);
  };

  const addStep = (qIdx: number) => {
    const next = structuredClone(draft);
    const q = next.questions[qIdx];
    q.steps.push({
      id: `${q.id}-s${q.steps.length + 1}-${Date.now()}`,
      description: 'New step criterion',
      maxMarks: 1,
      expectedKeywords: ['keyword'],
      conceptId: q.conceptId,
    });
    q.maxMarks = Number(q.steps.reduce((acc, s) => acc + s.maxMarks, 0).toFixed(1));
    next.totalMarks = Number(next.questions.reduce((acc, item) => acc + item.maxMarks, 0).toFixed(1));
    setDraft(next);
  };

  const removeStep = (qIdx: number, sIdx: number) => {
    const next = structuredClone(draft);
    const q = next.questions[qIdx];
    if (q.steps.length <= 1) return;
    q.steps.splice(sIdx, 1);
    q.maxMarks = Number(q.steps.reduce((acc, s) => acc + s.maxMarks, 0).toFixed(1));
    next.totalMarks = Number(next.questions.reduce((acc, item) => acc + item.maxMarks, 0).toFixed(1));
    setDraft(next);
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={handleOpenChange} width={680} maxHeight="82dvh" padding={5} purpose="form">
      <VStack gap={4}>
        <DialogHeader
          title="CBSE step-wise marking rubric"
          subtitle={`${draft.title} · ${draft.totalMarks} total marks`}
          onOpenChange={handleOpenChange}
        />

        <VStack gap={3} isScrollable style={{ maxHeight: '54dvh' }}>
          {draft.questions.map((q, qIdx) => (
            <Card key={q.id} padding={3} variant="muted">
              <VStack gap={3}>
                <HStack justify="between" align="center">
                  <HStack gap={2} align="center">
                    <Badge label={q.numberLabel} variant="neutral" />
                    <Text weight="medium">{q.prompt}</Text>
                  </HStack>
                  <Text type="supporting" color="secondary" hasTabularNumbers>
                    {q.maxMarks} marks
                  </Text>
                </HStack>

                <VStack gap={2}>
                  {q.steps.map((step, sIdx) => (
                    <Card key={step.id} padding={3} variant="default">
                      <VStack gap={2}>
                        <HStack gap={2} align="end">
                          <TextInput
                            label={`Step ${sIdx + 1} expectation`}
                            value={step.description}
                            onChange={(val) => updateStepDescription(qIdx, sIdx, val)}
                            size="sm"
                            width="100%"
                          />
                          <TextInput
                            label="Marks"
                            value={String(step.maxMarks)}
                            onChange={(val) => updateStepMarks(qIdx, sIdx, val)}
                            size="sm"
                            width={84}
                          />
                          <Button
                            label="Remove step"
                            variant="ghost"
                            size="sm"
                            isIconOnly
                            isDisabled={q.steps.length <= 1}
                            icon={<Trash2 size={16} strokeWidth={1.5} />}
                            onClick={() => removeStep(qIdx, sIdx)}
                          />
                        </HStack>
                        <TextInput
                          label="Accepted step keywords or expressions (comma-separated)"
                          value={step.expectedKeywords.join(', ')}
                          onChange={(val) => updateStepKeyword(qIdx, sIdx, val)}
                          size="sm"
                          width="100%"
                        />
                        {step.commonTrap ? (
                          <Text type="supporting" color="secondary">
                            Auto-trap guard: {step.commonTrap.trapName} (watches for{' '}
                            {step.commonTrap.badPattern.join(', ')})
                          </Text>
                        ) : null}
                      </VStack>
                    </Card>
                  ))}
                </VStack>

                <HStack justify="start">
                  <Button
                    label="Add marking step"
                    variant="secondary"
                    size="sm"
                    icon={<Plus size={16} strokeWidth={1.5} />}
                    onClick={() => addStep(qIdx)}
                  />
                </HStack>
              </VStack>
            </Card>
          ))}
        </VStack>

        <Divider />

        <HStack justify="end" gap={2}>
          <Button label="Cancel" variant="secondary" onClick={() => handleOpenChange(false)} />
          <Button
            label="Apply rubric"
            variant="primary"
            onClick={() => {
              onUpdateRubric(draft);
              onOpenChange(false);
            }}
          />
        </HStack>
      </VStack>
    </Dialog>
  );
}
