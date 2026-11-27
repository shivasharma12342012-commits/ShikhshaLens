import { useEffect, useState } from 'react';
import { Theme } from '@astryxdesign/core/theme';
import { AppShell } from '@astryxdesign/core/AppShell';
import {
  SideNav,
  SideNavHeading,
  SideNavSection,
  SideNavItem,
} from '@astryxdesign/core/SideNav';
import { Button } from '@astryxdesign/core/Button';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { Kbd } from '@astryxdesign/core/Kbd';
import {
  ScanLine,
  Mic,
  Target,
  Volume2,
  ShieldCheck,
  Search,
  Settings,
  Sun,
  Moon,
} from 'lucide-react';
import { themes, defaultThemeSlug } from './astryx-themes';
import {
  EXAM_RUBRICS,
  INITIAL_APAAR_RECORDS,
  INITIAL_STUDENTS,
  INITIAL_VOICE_OBSERVATIONS,
  type ApaarComplianceRecord,
  type ExamRubric,
  type StudentRecord,
  type TarlTier,
  type VoiceObservation,
} from './data/schoolData';
import type { PaperCheckReport } from './engine/paperChecker';
import { SettingsDialog, type AppSettings } from './components/SettingsDialog';
import { QuickJumpDialog, type NavDestination } from './components/QuickJumpDialog';
import { PaperStudioView } from './views/PaperStudioView';
import { VoiceHpcView } from './views/VoiceHpcView';
import { RemediationView } from './views/RemediationView';
import { ParentBridgeView } from './views/ParentBridgeView';
import { PrincipalRadarView } from './views/PrincipalRadarView';

const SETTINGS_STORAGE_KEY = 'shikshalens.settings.v1';

const DEFAULT_SETTINGS: AppSettings = {
  board: 'CBSE',
  schoolName: 'Vidya Bharati Public School, Pune',
  teacherName: 'Meenakshi Deshmukh',
  geminiApiKey: '',
  darkMode: false,
  strictStepMarking: true,
};

function BrandNotebookMark() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="2.5"
        y="2"
        width="15"
        height="16"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line x1="6.5" y1="2.5" x2="6.5" y2="17.5" stroke="#B8432E" strokeWidth="1.5" />
      <line x1="9" y1="7" x2="14.5" y2="7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="9" y1="10.5" x2="14.5" y2="10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="9" y1="14" x2="12.5" y2="14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export default function App() {
  const [activeNav, setActiveNav] = useState<NavDestination>('paper');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQuickJumpOpen, setIsQuickJumpOpen] = useState(false);

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      // ignore storage errors
    }
    return DEFAULT_SETTINGS;
  });

  const [students, setStudents] = useState<StudentRecord[]>(INITIAL_STUDENTS);
  const [rubrics, setRubrics] = useState<ExamRubric[]>(EXAM_RUBRICS);
  const [observations, setObservations] = useState<VoiceObservation[]>(
    INITIAL_VOICE_OBSERVATIONS,
  );
  const [apaarRecords, setApaarRecords] = useState<ApaarComplianceRecord[]>(
    INITIAL_APAAR_RECORDS,
  );

  // Persist settings locally
  const handleSaveSettings = (next: AppSettings) => {
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  };

  // Global Ctrl+K / Cmd+K quick jump
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsQuickJumpOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Live cross-app update when a teacher commits a checked paper
  const handleCommitGrade = (studentId: string, report: PaperCheckReport) => {
    setStudents((prev) =>
      prev.map((st) => {
        if (st.id !== studentId) return st;

        const nextMastery = { ...st.conceptMastery };
        for (const q of report.questions) {
          for (const step of q.steps) {
            const pct = Math.round((step.awardedMarks / Math.max(0.5, step.maxMarks)) * 100);
            const current = nextMastery[step.conceptId] ?? 65;
            nextMastery[step.conceptId] = Math.round(current * 0.4 + pct * 0.6);
            if (step.trapDetected) {
              const prereq = step.trapDetected.prerequisiteConceptId;
              nextMastery[prereq] = Math.min(nextMastery[prereq] ?? 50, 42);
            }
          }
        }

        const nextTier: TarlTier =
          report.percentage < 60 ? 'Foundation' : report.percentage < 82 ? 'Core' : 'Challenge';
        const nextCog =
          report.percentage >= 82 ? 'Advanced' : report.percentage >= 60 ? 'Proficient' : 'Beginner';

        const focusFromXRay =
          report.conceptXRays.length > 0
            ? report.conceptXRays
                .map((x) => `${x.rootPrerequisite.grade} ${x.rootPrerequisite.name}`)
                .join(' and ')
            : st.hpcFocusArea;

        return {
          ...st,
          recentScorePct: report.percentage,
          scoreDelta: report.percentage - st.recentScorePct,
          tarlTier: nextTier,
          conceptMastery: nextMastery,
          hpcDomains: {
            ...st.hpcDomains,
            cognitive: nextCog,
          },
          hpcFocusArea: focusFromXRay,
          lastGradedExam: report.rubricTitle,
          riskLevel:
            report.percentage < 58 || st.attendancePct < 78
              ? 'At Risk'
              : report.percentage < 70
                ? 'Watch'
                : 'Stable',
        };
      }),
    );
  };

  const handleAddObservations = (newObs: VoiceObservation[]) => {
    setObservations((prev) => [...newObs, ...prev]);
    setStudents((prev) =>
      prev.map((st) => {
        const matched = newObs.find((o) => o.studentId === st.id);
        if (!matched) return st;
        const domainKey =
          matched.domain === 'Cognitive'
            ? 'cognitive'
            : matched.domain === 'Socio-Emotional'
              ? 'socioEmotional'
              : 'psychomotor';
        return {
          ...st,
          hpcDomains: {
            ...st.hpcDomains,
            [domainKey]: matched.level,
          },
          hpcFocusArea: matched.isFlag ? matched.summary : st.hpcFocusArea,
          hpcStrength: !matched.isFlag ? matched.summary : st.hpcStrength,
        };
      }),
    );
  };

  const handleUpdateStudentHpc = (studentId: string, patch: Partial<StudentRecord>) => {
    setStudents((prev) => prev.map((st) => (st.id === studentId ? { ...st, ...patch } : st)));
  };

  const handleChangeStudentTier = (studentId: string, tier: TarlTier) => {
    setStudents((prev) => prev.map((st) => (st.id === studentId ? { ...st, tarlTier: tier } : st)));
  };

  const handleRecordParentReply = (studentId: string, replyText: string) => {
    setStudents((prev) =>
      prev.map((st) =>
        st.id === studentId
          ? { ...st, parentVoiceInput: replyText, parentVoiceSubmitted: true }
          : st,
      ),
    );
  };

  const handleResolveApaar = (recordId: string) => {
    setApaarRecords((prev) =>
      prev.map((rec) =>
        rec.id === recordId
          ? {
              ...rec,
              studentNameRegister: rec.studentNameAadhaar,
              dobRegister: rec.dobAadhaar,
              fatherNameRegister: rec.fatherNameAadhaar,
              consentSigned: true,
              apaarStatus: 'Verified',
            }
          : rec,
      ),
    );
  };

  const atRiskCount = students.filter((s) => s.riskLevel !== 'Stable').length;
  const pendingParentReplies = students.filter((s) => !s.parentVoiceSubmitted).length;

  return (
    <Theme theme={themes[defaultThemeSlug]} mode={settings.darkMode ? 'dark' : 'light'}>
      <AppShell
        variant="surface"
        height="fill"
        sideNav={
          <SideNav
            collapsible={{ defaultIsCollapsed: false, hasButton: true }}
            resizable={{ defaultWidth: 264, minWidth: 228, maxWidth: 320 }}
            header={
              <SideNavHeading
                heading="ShikshaLens"
                subheading={`${settings.board} · Class 7B`}
                icon={<BrandNotebookMark />}
              />
            }
            topContent={
              <HStack gap={2} align="center">
                <Button
                  label="Quick jump"
                  variant="secondary"
                  size="sm"
                  width="100%"
                  icon={<Search size={16} strokeWidth={1.5} />}
                  onClick={() => setIsQuickJumpOpen(true)}
                />
                <Kbd keys="Ctrl+K" />
              </HStack>
            }
            footer={
              <VStack gap={2}>
                <HStack justify="between" align="center">
                  <VStack gap={0}>
                    <Text type="supporting" weight="medium">
                      {settings.teacherName}
                    </Text>
                    <Text type="supporting" color="secondary">
                      {settings.geminiApiKey.trim() ? 'Gemini Vision' : 'Offline OCR'}
                    </Text>
                  </VStack>
                </HStack>
                <HStack gap={2}>
                  <Button
                    label="Settings"
                    variant="secondary"
                    size="sm"
                    width="100%"
                    icon={<Settings size={16} strokeWidth={1.5} />}
                    onClick={() => setIsSettingsOpen(true)}
                  />
                  <Button
                    label={settings.darkMode ? 'Light mode' : 'Dark mode'}
                    variant="secondary"
                    size="sm"
                    isIconOnly
                    tooltip={settings.darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                    icon={
                      settings.darkMode ? (
                        <Sun size={16} strokeWidth={1.5} />
                      ) : (
                        <Moon size={16} strokeWidth={1.5} />
                      )
                    }
                    onClick={() =>
                      handleSaveSettings({ ...settings, darkMode: !settings.darkMode })
                    }
                  />
                </HStack>
              </VStack>
            }
          >
            <SideNavSection title="Daily teaching">
              <SideNavItem
                label="Paper Studio"
                icon={<ScanLine size={16} strokeWidth={1.5} />}
                isSelected={activeNav === 'paper'}
                onClick={() => setActiveNav('paper')}
              />
              <SideNavItem
                label="Voice-to-HPC"
                icon={<Mic size={16} strokeWidth={1.5} />}
                isSelected={activeNav === 'hpc'}
                endContent={
                  <Text type="supporting" color="secondary" className="sl-mono">
                    {observations.length}
                  </Text>
                }
                onClick={() => setActiveNav('hpc')}
              />
              <SideNavItem
                label="10-Minute Fix"
                icon={<Target size={16} strokeWidth={1.5} />}
                isSelected={activeNav === 'remediation'}
                onClick={() => setActiveNav('remediation')}
              />
            </SideNavSection>

            <SideNavSection title="Families & school">
              <SideNavItem
                label="Parent Bridge"
                icon={<Volume2 size={16} strokeWidth={1.5} />}
                isSelected={activeNav === 'parents'}
                endContent={
                  pendingParentReplies > 0 ? (
                    <Text type="supporting" color="secondary" className="sl-mono">
                      {pendingParentReplies}
                    </Text>
                  ) : undefined
                }
                onClick={() => setActiveNav('parents')}
              />
              <SideNavItem
                label="Principal Radar"
                icon={<ShieldCheck size={16} strokeWidth={1.5} />}
                isSelected={activeNav === 'radar'}
                endContent={
                  <Text type="supporting" color="secondary" className="sl-mono">
                    {atRiskCount}
                  </Text>
                }
                onClick={() => setActiveNav('radar')}
              />
            </SideNavSection>
          </SideNav>
        }
      >
        {activeNav === 'paper' ? (
          <PaperStudioView
            students={students}
            rubrics={rubrics}
            geminiApiKey={settings.geminiApiKey}
            onUpdateRubric={(updated) =>
              setRubrics((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
            }
            onCommitGrade={handleCommitGrade}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        ) : null}

        {activeNav === 'hpc' ? (
          <VoiceHpcView
            schoolName={settings.schoolName}
            teacherName={settings.teacherName}
            students={students}
            observations={observations}
            onAddObservations={handleAddObservations}
            onUpdateStudentHpc={handleUpdateStudentHpc}
          />
        ) : null}

        {activeNav === 'remediation' ? (
          <RemediationView
            students={students}
            onChangeStudentTier={handleChangeStudentTier}
          />
        ) : null}

        {activeNav === 'parents' ? (
          <ParentBridgeView
            students={students}
            onRecordParentReply={handleRecordParentReply}
          />
        ) : null}

        {activeNav === 'radar' ? (
          <PrincipalRadarView
            schoolName={settings.schoolName}
            students={students}
            apaarRecords={apaarRecords}
            onResolveApaar={handleResolveApaar}
            onJumpToStudentHpc={() => setActiveNav('hpc')}
          />
        ) : null}
      </AppShell>

      <SettingsDialog
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        settings={settings}
        onSave={handleSaveSettings}
      />

      <QuickJumpDialog
        isOpen={isQuickJumpOpen}
        onOpenChange={setIsQuickJumpOpen}
        students={students}
        onNavigate={setActiveNav}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
    </Theme>
  );
}
