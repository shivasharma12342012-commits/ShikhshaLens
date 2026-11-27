import { useState } from 'react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Divider } from '@astryxdesign/core/Divider';
import { Popover } from '@astryxdesign/core/Popover';
import { Table } from '@astryxdesign/core/Table';
import { Printer, ArrowRightLeft, Presentation } from 'lucide-react';
import {
  CONCEPT_GRAPH,
  type StudentRecord,
  type TarlTier,
} from '../data/schoolData';

interface RemediationViewProps {
  students: StudentRecord[];
  onChangeStudentTier: (studentId: string, tier: TarlTier) => void;
}

const MATH_CONCEPTS = [
  'c5-integer-signs',
  'c6-transposition',
  'c7-linear-eq',
  'c5-lcm-hcf',
  'c7-fractions-ops',
  'c6-perimeter-area',
];

const TIER_WORKSHEETS: Record<
  TarlTier,
  { subtitle: string; goal: string; tasks: string[] }
> = {
  Foundation: {
    subtitle: 'Visual & Class 5 prerequisite rebuild',
    goal: 'Heal sign-transposition and LCM foundations using balance scales and paper strips',
    tasks: [
      '1. Balance check: If x - 5 = 10, add 5 to both sides. What is x?',
      '2. Fold a strip into 6 equal parts: shade 1/2 (3 parts) and 1/3 (2 parts). Count total sixths.',
      '3. Fix the mistake: Rohan wrote 3x = 15 - 12 from 3x - 12 = 15. Circle the wrong sign and solve.',
    ],
  },
  Core: {
    subtitle: 'Grade-level CBSE step fluency',
    goal: 'Build clean step-wise exam habits under 10-minute timed practice',
    tasks: [
      '1. Solve showing all 3 CBSE steps: 4(x - 3) = 20',
      '2. Add unlike fractions using LCM: 2/3 + 1/4',
      '3. Find perimeter of a notebook cover measuring 18 cm by 12 cm (include unit).',
    ],
  },
  Challenge: {
    subtitle: 'Extension & peer-mentor prompts',
    goal: 'Apply linear equations + fractions together in real Indian word problems',
    tasks: [
      '1. A school library spends 1/2 its grant on science books and 1/3 on storybooks, leaving ₹4,000. Find total grant.',
      '2. Solve and verify by substitution: 3(2x - 5) + 4 = 25',
      '3. Peer coach check: Pair with a Foundation partner for 3 minutes to explain why 1/2 + 1/3 cannot be 2/5.',
    ],
  },
};

export function RemediationView({
  students,
  onChangeStudentTier,
}: RemediationViewProps) {
  const [scriptLang, setScriptLang] = useState<'en' | 'hi'>('en');

  // Compute class-wide mastery per concept to identify the #1 bottleneck
  const conceptAverages = MATH_CONCEPTS.map((cid) => {
    const avg = Math.round(
      students.reduce((acc, st) => acc + (st.conceptMastery[cid] ?? 70), 0) /
        Math.max(1, students.length),
    );
    const strugglingCount = students.filter((st) => (st.conceptMastery[cid] ?? 70) < 60).length;
    return {
      concept: CONCEPT_GRAPH[cid],
      avg,
      strugglingCount,
      strugglingPct: Math.round((strugglingCount / Math.max(1, students.length)) * 100),
    };
  }).sort((a, b) => a.avg - b.avg);

  const topBottleneck = conceptAverages[0];

  const heatmapRows = students.map((st) => ({
    id: st.id,
    student: `${st.rollNo} · ${st.name}`,
    tier: st.tarlTier,
    ...Object.fromEntries(
      MATH_CONCEPTS.map((cid) => [cid, st.conceptMastery[cid] ?? 70]),
    ),
  }));

  const heatClass = (val: number) =>
    val < 55 ? 'sl-heat-cell sl-heat-low' : val < 75 ? 'sl-heat-cell sl-heat-mid' : 'sl-heat-cell sl-heat-high';

  return (
    <VStack gap={5} padding={6} maxWidth={1480}>
      {/* Header */}
      <HStack justify="between" align="end" wrap="wrap" gap={3} className="sl-no-print">
        <VStack gap={1}>
          <Heading level={1} weight="medium">
            Tomorrow&apos;s 10-Minute Fix
          </Heading>
          <Text color="secondary">
            Class 7B Concept Heatmap and Teaching-at-the-Right-Level (TaRL) micro-groups generated from graded papers
          </Text>
        </VStack>

        <HStack gap={2}>
          <Button
            label={scriptLang === 'en' ? 'Switch blackboard script to Hinglish' : 'Switch blackboard script to English'}
            variant="secondary"
            onClick={() => setScriptLang(scriptLang === 'en' ? 'hi' : 'en')}
          />
          <Button
            label="Print 1-page TaRL worksheet"
            variant="primary"
            icon={<Printer size={16} strokeWidth={1.5} />}
            onClick={() => window.print()}
          />
        </HStack>
      </HStack>

      {/* #1 Class Bottleneck — 10-Minute Opening Blackboard Script */}
      <Card padding={5} variant="default">
        <Grid columns={{ minWidth: 320, max: 2 }} gap={5} align="start">
          <VStack gap={2} className="sl-margin-rule">
            <HStack gap={2} align="center">
              <Presentation size={16} strokeWidth={1.5} />
              <Text type="label" color="secondary">
                Highest-impact 10-minute morning opener
              </Text>
              <Badge label={`${topBottleneck.strugglingPct}% of class below 60%`} variant="error" />
            </HStack>
            <Heading level={2} weight="medium">
              Re-teach {topBottleneck.concept.grade}: {topBottleneck.concept.name}
            </Heading>
            <Text>
              {scriptLang === 'en'
                ? topBottleneck.concept.remediationTipEn
                : topBottleneck.concept.remediationTipHi}
            </Text>
            <Text type="supporting" color="secondary" hasTabularNumbers>
              Class average: {topBottleneck.avg}% · {topBottleneck.strugglingCount} of {students.length} students missed this foundational step in Unit Test 2
            </Text>
          </VStack>

          <Card padding={4} variant="muted">
            <VStack gap={2}>
              <Text type="label" color="secondary">
                Write this on the blackboard (2 minutes)
              </Text>
              <Text type="code" weight="medium">
                {topBottleneck.concept.blackboardExample}
              </Text>
              <Divider />
              <Text type="supporting" color="secondary">
                Check for understanding: Ask the Foundation bench to estimate before calculating—then split into the 3 practice tiers below for 8 minutes.
              </Text>
            </VStack>
          </Card>
        </Grid>
      </Card>

      {/* Live Class Concept Mastery Matrix */}
      <VStack gap={3} className="sl-no-print">
        <HStack justify="between" align="center" wrap="wrap" gap={2}>
          <Heading level={3} weight="medium">
            Class 7B Concept Mastery Heatmap
          </Heading>
          <HStack gap={3} align="center">
            <Text type="supporting" color="secondary">
              Red &lt; 55% · Amber 55–74% · Green 75%+
            </Text>
          </HStack>
        </HStack>

        <Card padding={3} variant="default">
          <Table
            data={heatmapRows}
            idKey="id"
            density="compact"
            hasHover
            columns={[
              {
                key: 'student',
                header: 'Student',
                renderCell: (row) => <Text weight="medium">{String(row.student)}</Text>,
              },
              ...MATH_CONCEPTS.map((cid) => ({
                key: cid,
                header: CONCEPT_GRAPH[cid].name.split(' ')[0] + ' (' + CONCEPT_GRAPH[cid].grade.replace('Class ', 'C') + ')',
                align: 'center' as const,
                renderCell: (row: Record<string, unknown>) => {
                  const val = Number(row[cid] ?? 0);
                  return <Text className={heatClass(val)}>{val}%</Text>;
                },
              })),
              {
                key: 'tier',
                header: 'TaRL group',
                align: 'end' as const,
                renderCell: (row) => (
                  <Badge
                    label={String(row.tier)}
                    variant={
                      row.tier === 'Foundation'
                        ? 'error'
                        : row.tier === 'Core'
                          ? 'warning'
                          : 'success'
                    }
                  />
                ),
              },
            ]}
          />
        </Card>
      </VStack>

      {/* 3-Tier TaRL Micro-Group Practice Sheets */}
      <VStack gap={3} className="sl-print-sheet">
        <Heading level={3} weight="medium">
          Auto-grouped TaRL practice tiers
        </Heading>

        <Grid columns={{ minWidth: 300, max: 3 }} gap={4} align="stretch">
          {(['Foundation', 'Core', 'Challenge'] as TarlTier[]).map((tier) => {
            const members = students.filter((s) => s.tarlTier === tier);
            const sheet = TIER_WORKSHEETS[tier];
            return (
              <Card key={tier} padding={4} variant="default">
                <VStack gap={3}>
                  <HStack justify="between" align="start">
                    <VStack gap={0.5}>
                      <Heading level={4} weight="medium">
                        {tier} group
                      </Heading>
                      <Text type="supporting" color="secondary">
                        {sheet.subtitle}
                      </Text>
                    </VStack>
                    <Badge
                      label={`${members.length} students`}
                      variant={
                        tier === 'Foundation' ? 'error' : tier === 'Core' ? 'warning' : 'success'
                      }
                    />
                  </HStack>

                  {/* Assigned Students with Popover Reassign */}
                  <HStack gap={1.5} wrap="wrap">
                    {members.map((m) => (
                      <Popover
                        key={m.id}
                        label={`Reassign ${m.name}`}
                        padding={2}
                        content={
                          <VStack gap={1} width={170}>
                            <Text type="supporting" color="secondary">
                              Move {m.name.split(' ')[0]} to:
                            </Text>
                            {(['Foundation', 'Core', 'Challenge'] as TarlTier[]).map((targetTier) => (
                              <Button
                                key={targetTier}
                                label={targetTier}
                                variant={m.tarlTier === targetTier ? 'primary' : 'ghost'}
                                size="sm"
                                width="100%"
                                onClick={() => onChangeStudentTier(m.id, targetTier)}
                              />
                            ))}
                          </VStack>
                        }
                      >
                        <Button
                          label={m.name.split(' ')[0]}
                          variant="secondary"
                          size="sm"
                          icon={<ArrowRightLeft size={16} strokeWidth={1.5} />}
                        />
                      </Popover>
                    ))}
                  </HStack>

                  <Divider />

                  <VStack gap={2}>
                    <Text type="supporting" color="secondary">
                      {sheet.goal}
                    </Text>
                    {sheet.tasks.map((task, idx) => (
                      <Text key={idx} type="supporting">
                        {task}
                      </Text>
                    ))}
                  </VStack>
                </VStack>
              </Card>
            );
          })}
        </Grid>
      </VStack>
    </VStack>
  );
}
