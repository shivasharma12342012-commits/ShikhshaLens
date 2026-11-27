import { useState } from 'react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Table } from '@astryxdesign/core/Table';
import { Drawer } from '@astryxdesign/core/Drawer';
import { Divider } from '@astryxdesign/core/Divider';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { TabList, Tab } from '@astryxdesign/core/TabList';
import { Banner } from '@astryxdesign/core/Banner';
import { ShieldCheck, AlertTriangle, X, Check, FileCheck2 } from 'lucide-react';
import {
  CONCEPT_GRAPH,
  type ApaarComplianceRecord,
  type StudentRecord,
} from '../data/schoolData';

interface PrincipalRadarViewProps {
  schoolName: string;
  students: StudentRecord[];
  apaarRecords: ApaarComplianceRecord[];
  onResolveApaar: (recordId: string) => void;
  onJumpToStudentHpc: () => void;
}

export function PrincipalRadarView({
  schoolName,
  students,
  apaarRecords,
  onResolveApaar,
  onJumpToStudentHpc,
}: PrincipalRadarViewProps) {
  const [activeTab, setActiveTab] = useState('radar');
  const [inspectStudent, setInspectStudent] = useState<StudentRecord | null>(null);

  const avgScore = Math.round(
    students.reduce((acc, s) => acc + s.recentScorePct, 0) / Math.max(1, students.length),
  );
  const atRiskCount = students.filter((s) => s.riskLevel === 'At Risk').length;
  const watchCount = students.filter((s) => s.riskLevel === 'Watch').length;
  const hpcReadyPct = Math.round(
    (students.filter((s) => s.parentVoiceSubmitted).length / Math.max(1, students.length)) * 100,
  );
  const apaarIssues = apaarRecords.filter((r) => r.apaarStatus !== 'Verified').length;

  const studentRows = students.map((st) => ({ ...st }) as StudentRecord & Record<string, unknown>);
  const apaarRows = apaarRecords.map(
    (rec) => ({ ...rec }) as ApaarComplianceRecord & Record<string, unknown>,
  );

  return (
    <VStack gap={5} padding={6} maxWidth={1480}>
      {/* Header */}
      <HStack justify="between" align="end" wrap="wrap" gap={3}>
        <VStack gap={1}>
          <Heading level={1} weight="medium">
            Principal&apos;s Live Learning Radar
          </Heading>
          <Text color="secondary">
            {schoolName} · Term 2 early-warning slippage tracker and APAAR / UDISE+ compliance audit
          </Text>
        </VStack>

        <Badge
          label={apaarIssues === 0 ? 'Audit ready' : `${apaarIssues} APAAR mismatches flagged`}
          variant={apaarIssues === 0 ? 'success' : 'warning'}
        />
      </HStack>

      {/* Clean KPI Row — numbers only, one format, explicit comparison */}
      <Grid columns={{ minWidth: 200, max: 4 }} gap={4}>
        <Card padding={4} variant="default">
          <VStack gap={1}>
            <Text type="supporting" color="secondary">
              Class 7B concept mastery
            </Text>
            <Heading level={2} weight="medium" className="sl-tabular">
              {avgScore}%
            </Heading>
            <Text type="supporting" color="secondary">
              -3% vs Unit Test 1
            </Text>
          </VStack>
        </Card>

        <Card padding={4} variant="default">
          <VStack gap={1}>
            <Text type="supporting" color="secondary">
              Early-warning students
            </Text>
            <Heading level={2} weight="medium" className="sl-tabular">
              {atRiskCount + watchCount}
            </Heading>
            <Text type="supporting" color="secondary">
              {atRiskCount} at risk · {watchCount} on watch
            </Text>
          </VStack>
        </Card>

        <Card padding={4} variant="default">
          <VStack gap={1}>
            <Text type="supporting" color="secondary">
              NEP 360° HPC completion
            </Text>
            <Heading level={2} weight="medium" className="sl-tabular">
              {hpcReadyPct}%
            </Heading>
            <Text type="supporting" color="secondary">
              +28% vs manual Term 1
            </Text>
          </VStack>
        </Card>

        <Card padding={4} variant="default">
          <VStack gap={1}>
            <Text type="supporting" color="secondary">
              APAAR / UDISE+ mismatches
            </Text>
            <Heading level={2} weight="medium" className="sl-tabular">
              {apaarIssues}
            </Heading>
            <Text type="supporting" color="secondary">
              Of {apaarRecords.length} audited records
            </Text>
          </VStack>
        </Card>
      </Grid>

      <TabList value={activeTab} onChange={setActiveTab} hasDivider>
        <Tab
          value="radar"
          label="At-risk learning radar"
          icon={<AlertTriangle size={16} strokeWidth={1.5} />}
          endContent={
            <Text type="supporting" color="secondary" className="sl-mono">
              {atRiskCount + watchCount}
            </Text>
          }
        />
        <Tab
          value="apaar"
          label="APAAR / UDISE+ mismatch scanner"
          icon={<ShieldCheck size={16} strokeWidth={1.5} />}
          endContent={
            <Text type="supporting" color="secondary" className="sl-mono">
              {apaarIssues}
            </Text>
          }
        />
      </TabList>

      {activeTab === 'radar' ? (
        <Card padding={3} variant="default">
          <Table
            data={studentRows}
            idKey="id"
            density="balanced"
            textOverflow="wrap"
            hasHover
            columns={[
              {
                key: 'name',
                header: 'Student',
                renderCell: (row) => {
                  const st = row as StudentRecord;
                  return (
                    <Button
                      label={`${st.rollNo} · ${st.name}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => setInspectStudent(st)}
                    />
                  );
                },
              },
              {
                key: 'attendancePct',
                header: 'Attendance',
                align: 'end',
                renderCell: (row) => {
                  const st = row as StudentRecord;
                  return (
                    <Text hasTabularNumbers>
                      {st.attendancePct}% ({st.attendanceDelta >= 0 ? `+${st.attendanceDelta}` : st.attendanceDelta}%)
                    </Text>
                  );
                },
              },
              {
                key: 'recentScorePct',
                header: 'Latest test',
                align: 'end',
                renderCell: (row) => {
                  const st = row as StudentRecord;
                  return (
                    <Text hasTabularNumbers>
                      {st.recentScorePct}% ({st.scoreDelta >= 0 ? `+${st.scoreDelta}` : st.scoreDelta}%)
                    </Text>
                  );
                },
              },
              {
                key: 'tarlTier',
                header: 'TaRL tier',
                renderCell: (row) => {
                  const st = row as StudentRecord;
                  return (
                    <Badge
                      label={st.tarlTier}
                      variant={
                        st.tarlTier === 'Foundation'
                          ? 'error'
                          : st.tarlTier === 'Core'
                            ? 'warning'
                            : 'success'
                      }
                    />
                  );
                },
              },
              {
                key: 'riskLevel',
                header: 'Early warning',
                renderCell: (row) => {
                  const st = row as StudentRecord;
                  return (
                    <HStack gap={1.5} align="center">
                      <StatusDot
                        variant={
                          st.riskLevel === 'At Risk'
                            ? 'error'
                            : st.riskLevel === 'Watch'
                              ? 'warning'
                              : 'success'
                        }
                        label={st.riskLevel}
                      />
                      <Text type="supporting">{st.riskLevel}</Text>
                    </HStack>
                  );
                },
              },
              {
                key: 'action',
                header: '',
                align: 'end',
                renderCell: (row) => {
                  const st = row as StudentRecord;
                  return (
                    <Button
                      label="Inspect"
                      variant="secondary"
                      size="sm"
                      onClick={() => setInspectStudent(st)}
                    />
                  );
                },
              },
            ]}
          />
        </Card>
      ) : null}

      {activeTab === 'apaar' ? (
        <VStack gap={3}>
          <Banner
            status={apaarIssues > 0 ? 'warning' : 'success'}
            title={
              apaarIssues > 0
                ? `${apaarIssues} Aadhaar-to-Register discrepancies detected before UDISE+ upload`
                : 'All audited student records match Aadhaar and have parental consent'
            }
            description="Catches common Indian compliance blockers (middle-name abbreviations like Kr. vs Kumar, DD/MM vs MM/DD date swaps, and missing parent consent) so teachers do not spend weeks correcting rejected APAAR uploads."
          />

          <Card padding={3} variant="default">
            <Table
              data={apaarRows}
              idKey="id"
              density="balanced"
              hasHover
              columns={[
                {
                  key: 'studentNameRegister',
                  header: 'School register',
                  renderCell: (row) => {
                    const r = row as ApaarComplianceRecord;
                    return (
                      <VStack gap={0.5}>
                        <Text weight="medium">{r.studentNameRegister}</Text>
                        <Text type="supporting" color="secondary" hasTabularNumbers>
                          DOB {r.dobRegister} · Father: {r.fatherNameRegister}
                        </Text>
                      </VStack>
                    );
                  },
                },
                {
                  key: 'studentNameAadhaar',
                  header: 'Aadhaar / DigiLocker',
                  renderCell: (row) => {
                    const r = row as ApaarComplianceRecord;
                    return (
                      <VStack gap={0.5}>
                        <Text weight="medium">{r.studentNameAadhaar}</Text>
                        <Text type="supporting" color="secondary" hasTabularNumbers>
                          DOB {r.dobAadhaar} · Father: {r.fatherNameAadhaar}
                        </Text>
                      </VStack>
                    );
                  },
                },
                {
                  key: 'apaarStatus',
                  header: 'Audit status',
                  renderCell: (row) => {
                    const r = row as ApaarComplianceRecord;
                    return (
                      <Badge
                        label={r.apaarStatus}
                        variant={r.apaarStatus === 'Verified' ? 'success' : 'error'}
                      />
                    );
                  },
                },
                {
                  key: 'resolve',
                  header: 'Action',
                  align: 'end',
                  renderCell: (row) => {
                    const r = row as ApaarComplianceRecord;
                    return r.apaarStatus === 'Verified' ? (
                      <HStack gap={1} align="center" justify="end">
                        <Check size={16} strokeWidth={1.5} />
                        <Text type="supporting" color="secondary">
                          Ready for UDISE+
                        </Text>
                      </HStack>
                    ) : (
                      <Button
                        label="Sync & generate slip"
                        variant="secondary"
                        size="sm"
                        icon={<FileCheck2 size={16} strokeWidth={1.5} />}
                        onClick={() => onResolveApaar(r.id)}
                      />
                    );
                  },
                },
              ]}
            />
          </Card>
        </VStack>
      ) : null}

      {/* Student Deep-Dive Inspector Drawer */}
      <Drawer
        isOpen={Boolean(inspectStudent)}
        onOpenChange={(open) => {
          if (!open) setInspectStudent(null);
        }}
        label="Student learning profile"
        side="end"
        width={460}
        padding={5}
      >
        {inspectStudent ? (
          <VStack gap={4}>
            <HStack justify="between" align="start">
              <VStack gap={0.5} className="sl-margin-rule">
                <Heading level={3} weight="medium">
                  {inspectStudent.name}
                </Heading>
                <Text type="supporting" color="secondary" hasTabularNumbers>
                  {inspectStudent.className} · Roll {inspectStudent.rollNo} · APAAR {inspectStudent.apaarId}
                </Text>
              </VStack>
              <Button
                label="Close drawer"
                variant="ghost"
                size="sm"
                isIconOnly
                icon={<X size={16} strokeWidth={1.5} />}
                onClick={() => setInspectStudent(null)}
              />
            </HStack>

            {inspectStudent.riskReason ? (
              <Banner
                status={inspectStudent.riskLevel === 'At Risk' ? 'error' : 'warning'}
                title={`${inspectStudent.riskLevel} signal`}
                description={inspectStudent.riskReason}
              />
            ) : null}

            <VStack gap={3}>
              <Text type="label" color="secondary">
                Concept mastery breakdown
              </Text>
              {Object.entries(inspectStudent.conceptMastery).map(([cid, score]) => {
                const node = CONCEPT_GRAPH[cid];
                if (!node) return null;
                return (
                  <VStack key={cid} gap={1}>
                    <HStack justify="between">
                      <Text type="supporting">
                        {node.grade}: {node.name}
                      </Text>
                      <Text type="supporting" color="secondary" hasTabularNumbers>
                        {score}%
                      </Text>
                    </HStack>
                    <ProgressBar
                      label={node.name}
                      isLabelHidden
                      value={score}
                      max={100}
                      variant={score < 55 ? 'error' : score < 75 ? 'warning' : 'success'}
                    />
                  </VStack>
                );
              })}
            </VStack>

            <Divider />

            <VStack gap={1}>
              <Text type="label" color="secondary">
                Recommended school action
              </Text>
              <Text type="supporting">{inspectStudent.hpcFocusArea}</Text>
            </VStack>

            <HStack justify="end" gap={2}>
              <Button
                label="Open in HPC Studio"
                variant="primary"
                onClick={() => {
                  setInspectStudent(null);
                  onJumpToStudentHpc();
                }}
              />
            </HStack>
          </VStack>
        ) : null}
      </Drawer>
    </VStack>
  );
}
