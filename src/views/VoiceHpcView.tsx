import { useRef, useState } from 'react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Selector } from '@astryxdesign/core/Selector';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Divider } from '@astryxdesign/core/Divider';
import { Banner } from '@astryxdesign/core/Banner';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Popover } from '@astryxdesign/core/Popover';
import { Mic, MicOff, Printer, FileText, BookOpen } from 'lucide-react';
import type { StudentRecord, VoiceObservation, CompetencyLevel } from '../data/schoolData';
import {
  SAMPLE_VOICE_TRANSCRIPTS,
  parseVoiceObservationToHpc,
} from '../engine/voiceHpcParser';

interface VoiceHpcViewProps {
  schoolName: string;
  teacherName: string;
  students: StudentRecord[];
  observations: VoiceObservation[];
  onAddObservations: (newObs: VoiceObservation[]) => void;
  onUpdateStudentHpc: (studentId: string, patch: Partial<StudentRecord>) => void;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const SPEECH_LANG_OPTIONS = [
  { value: 'en-IN', label: 'Hinglish / English (India)' },
  { value: 'hi-IN', label: 'Hindi (हिन्दी)' },
  { value: 'mr-IN', label: 'Marathi (मराठी)' },
  { value: 'ta-IN', label: 'Tamil (தமிழ்)' },
  { value: 'te-IN', label: 'Telugu (తెలుగు)' },
  { value: 'bn-IN', label: 'Bengali (বাংলা)' },
];

function levelBadgeVariant(level: CompetencyLevel) {
  if (level === 'Advanced') return 'success';
  if (level === 'Proficient') return 'info';
  return 'warning';
}

export function VoiceHpcView({
  schoolName,
  teacherName,
  students,
  observations,
  onAddObservations,
  onUpdateStudentHpc,
}: VoiceHpcViewProps) {
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id ?? '');
  const [speechLang, setSpeechLang] = useState('en-IN');
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);
  const [lastParsedCount, setLastParsedCount] = useState<number | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const student = students.find((s) => s.id === selectedStudentId) ?? students[0];
  const studentObs = observations.filter((o) => o.studentId === student.id);

  const toggleRecording = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechCtor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;

    if (!SpeechCtor) {
      setSpeechNotice(
        'Browser speech recognition is unavailable here. Pick a sample Hinglish voice note below or type directly.',
      );
      return;
    }

    setSpeechNotice(null);
    const recognition = new SpeechCtor();
    recognition.lang = speechLang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let combined = '';
      for (let i = 0; i < event.results.length; i += 1) {
        combined += event.results[i][0].transcript + ' ';
      }
      setTranscript(combined.trim());
    };
    recognition.onerror = () => {
      setIsListening(false);
      setSpeechNotice('Microphone permission was declined or unavailable. You can type or load a sample voice log.');
    };
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const handleParseAndLog = () => {
    if (!transcript.trim()) return;
    const langLabel =
      SPEECH_LANG_OPTIONS.find((o) => o.value === speechLang)?.label ?? speechLang;
    const parsed = parseVoiceObservationToHpc(transcript, langLabel, students);
    if (parsed.length > 0) {
      onAddObservations(parsed);
      setLastParsedCount(parsed.length);
      setSelectedStudentId(parsed[0].studentId);
      setTranscript('');
    }
  };

  return (
    <VStack gap={5} padding={6} maxWidth={1480}>
      {/* Header */}
      <HStack justify="between" align="end" wrap="wrap" gap={3} className="sl-no-print">
        <VStack gap={1}>
          <Heading level={1} weight="medium">
            Voice-to-HPC Studio
          </Heading>
          <Text color="secondary">
            Speak a 30-second classroom observation in Hindi, Hinglish, or English to auto-fill NEP 2020 PARAKH Holistic Progress Cards
          </Text>
        </VStack>

        <HStack gap={2}>
          <Selector
            label="Preview student HPC"
            isLabelHidden
            value={selectedStudentId}
            onChange={(val) => val && setSelectedStudentId(val)}
            options={students.map((st) => ({
              value: st.id,
              label: `Roll ${st.rollNo} · ${st.name}`,
              description: `${st.hpcDomains.cognitive} · ${st.tarlTier}`,
            }))}
            width={240}
          />
          <Button
            label="Print 360° HPC"
            variant="primary"
            icon={<Printer size={16} strokeWidth={1.5} />}
            onClick={() => window.print()}
          />
        </HStack>
      </HStack>

      <Grid columns={{ minWidth: 420, max: 2 }} gap={5} align="start">
        {/* LEFT: Voice Recorder & Observation Feed */}
        <VStack gap={4} className="sl-no-print">
          <Card padding={4} variant="default">
            <VStack gap={3}>
              <HStack justify="between" align="center" wrap="wrap" gap={2}>
                <HStack gap={2} align="center">
                  <StatusDot
                    variant={isListening ? 'error' : 'neutral'}
                    isPulsing={isListening}
                    label={isListening ? 'Recording live' : 'Microphone idle'}
                  />
                  <Heading level={3} weight="medium">
                    30-second classroom voice log
                  </Heading>
                </HStack>

                <Selector
                  label="Spoken language"
                  isLabelHidden
                  value={speechLang}
                  onChange={(val) => val && setSpeechLang(val)}
                  options={SPEECH_LANG_OPTIONS}
                  size="sm"
                  width={210}
                />
              </HStack>

              <HStack gap={2} wrap="wrap">
                <Button
                  label={isListening ? 'Stop recording' : 'Start voice note'}
                  variant={isListening ? 'destructive' : 'primary'}
                  icon={
                    isListening ? (
                      <MicOff size={16} strokeWidth={1.5} />
                    ) : (
                      <Mic size={16} strokeWidth={1.5} />
                    )
                  }
                  onClick={toggleRecording}
                />

                <Popover
                  label="Try a sample classroom voice note"
                  padding={2}
                  content={
                    <VStack gap={1} width={320}>
                      {SAMPLE_VOICE_TRANSCRIPTS.map((sample) => (
                        <Button
                          key={sample.label}
                          label={sample.label}
                          variant="ghost"
                          size="sm"
                          width="100%"
                          onClick={() => {
                            setTranscript(sample.text);
                            setLastParsedCount(null);
                          }}
                        />
                      ))}
                    </VStack>
                  }
                >
                  <Button
                    label="Load sample Hinglish note"
                    variant="secondary"
                    icon={<BookOpen size={16} strokeWidth={1.5} />}
                  />
                </Popover>
              </HStack>

              {speechNotice ? (
                <Banner status="info" title={speechNotice} />
              ) : null}

              <TextArea
                label="Live transcript (mention any student names from Class 7B)"
                placeholder="Example: Aaj science lab mein Ananya ne group lead kiya, par Aarav fractions mein confuse tha..."
                rows={4}
                value={transcript}
                onChange={setTranscript}
                width="100%"
              />

              <HStack justify="between" align="center" wrap="wrap" gap={3}>
                <Text type="supporting" color="secondary" style={{ flex: '1 1 240px' }}>
                  Maps each named student to PARAKH domain and Beginner / Proficient / Advanced rubric
                </Text>
                <Button
                  label="Extract into HPCs"
                  variant="primary"
                  isDisabled={!transcript.trim()}
                  icon={<FileText size={16} strokeWidth={1.5} />}
                  onClick={handleParseAndLog}
                />
              </HStack>

              {lastParsedCount !== null ? (
                <Banner
                  status="success"
                  title={`Mapped ${lastParsedCount} observation${lastParsedCount > 1 ? 's' : ''} to PARAKH progress cards`}
                  description="Student cognitive, socio-emotional, and psychomotor rubrics have been updated live."
                />
              ) : null}
            </VStack>
          </Card>

          {/* Recent Classroom Observation Log */}
          <Card padding={4} variant="default">
            <VStack gap={3}>
              <HStack justify="between" align="center">
                <Heading level={4} weight="medium">
                  Recent parsed observations
                </Heading>
                <Text type="supporting" color="secondary" hasTabularNumbers>
                  {observations.length} logged
                </Text>
              </HStack>

              <VStack gap={3}>
                {observations.slice(0, 6).map((obs, idx) => {
                  const obsStudent = students.find((s) => s.id === obs.studentId);
                  return (
                    <VStack key={obs.id} gap={2}>
                      {idx > 0 ? <Divider /> : null}
                      <VStack gap={1}>
                        <HStack justify="between" align="center" wrap="wrap" gap={2}>
                          <HStack gap={2} align="center">
                            <Button
                              label={obsStudent?.name ?? 'Student'}
                              variant="ghost"
                              size="sm"
                              onClick={() => obsStudent && setSelectedStudentId(obsStudent.id)}
                            />
                            <Text type="supporting" color="secondary">
                              {obs.domain}
                            </Text>
                            <Badge label={obs.level} variant={levelBadgeVariant(obs.level)} />
                          </HStack>
                          <Text type="supporting" color="secondary">
                            {obs.timestamp} · {obs.language}
                          </Text>
                        </HStack>
                        <Text type="supporting">{obs.summary}</Text>
                        <Text type="supporting" color="secondary">
                          Spoken: &ldquo;{obs.rawTranscript}&rdquo;
                        </Text>
                      </VStack>
                    </VStack>
                  );
                })}
              </VStack>
            </VStack>
          </Card>
        </VStack>

        {/* RIGHT: Official Print-Ready NEP 2020 PARAKH 360° Holistic Progress Card */}
        <Card padding={5} variant="default" className="sl-print-sheet">
          <VStack gap={4}>
            <HStack justify="between" align="start" wrap="wrap" gap={2}>
              <VStack gap={0.5} className="sl-margin-rule">
                <Text type="supporting" color="secondary">
                  NEP 2020 · PARAKH 360° Holistic Progress Card
                </Text>
                <Heading level={2} weight="medium">
                  {student.name}
                </Heading>
                <Text type="supporting" color="secondary" hasTabularNumbers>
                  {schoolName} · {student.className} · Roll {student.rollNo} · APAAR {student.apaarId}
                </Text>
              </VStack>
              <VStack gap={1} align="end">
                <Badge label="Term 2 · Nov 2026" variant="neutral" />
                <Text type="supporting" color="secondary" hasTabularNumbers>
                  Attendance {student.attendancePct}%
                </Text>
              </VStack>
            </HStack>

            <Divider />

            {/* 3 PARAKH Domains */}
            <VStack gap={2}>
              <Text type="label" color="secondary">
                PARAKH Competency Domains (Middle Stage)
              </Text>
              <Grid columns={{ minWidth: 150, max: 3 }} gap={3}>
                {(
                  [
                    { key: 'cognitive', title: 'Cognitive', desc: 'Conceptual mastery & reasoning' },
                    { key: 'socioEmotional', title: 'Socio-Emotional', desc: 'Collaboration & empathy' },
                    { key: 'psychomotor', title: 'Psychomotor', desc: 'Lab craft, art & movement' },
                  ] as const
                ).map((d) => {
                  const currentVal = student.hpcDomains[d.key];
                  return (
                    <Card key={d.key} padding={3} variant="muted">
                      <VStack gap={2} align="start">
                        <Text weight="medium">{d.title}</Text>
                        <Badge label={currentVal} variant={levelBadgeVariant(currentVal)} />
                        <Text type="supporting" color="secondary">
                          {d.desc}
                        </Text>
                      </VStack>
                    </Card>
                  );
                })}
              </Grid>
            </VStack>

            {/* Qualitative Teacher Synthesis */}
            <VStack gap={2}>
              <Text type="label" color="secondary">
                Teacher Qualitative Assessment ({teacherName})
              </Text>
              <Card padding={3} variant="muted">
                <VStack gap={2}>
                  <VStack gap={0.5}>
                    <Text type="supporting" color="secondary">
                      Observed strengths
                    </Text>
                    <Text>{student.hpcStrength}</Text>
                  </VStack>
                  <Divider />
                  <VStack gap={0.5}>
                    <Text type="supporting" color="secondary">
                      Next growth focus
                    </Text>
                    <Text>{student.hpcFocusArea}</Text>
                  </VStack>
                </VStack>
              </Card>
            </VStack>

            {/* Evidence from Voice Logs */}
            {studentObs.length > 0 ? (
              <VStack gap={2}>
                <Text type="label" color="secondary">
                  Classroom Evidence Trail ({studentObs.length} voice logs)
                </Text>
                {studentObs.slice(0, 3).map((item) => (
                  <HStack key={item.id} justify="between" align="start" gap={2}>
                    <Text type="supporting">• {item.summary}</Text>
                    <Text type="supporting" color="secondary" style={{ whiteSpace: 'nowrap' }}>
                      {item.domain}
                    </Text>
                  </HStack>
                ))}
              </VStack>
            ) : null}

            <Divider />

            {/* 360-Degree Self & Parent Reflections */}
            <Grid columns={{ minWidth: 220, max: 2 }} gap={3}>
              <Card padding={3} variant="muted">
                <VStack gap={1.5}>
                  <Text type="label" color="secondary">
                    Student Self-Reflection
                  </Text>
                  <TextArea
                    label="Student reflection"
                    isLabelHidden
                    rows={2}
                    value={student.selfReflection}
                    onChange={(val) => onUpdateStudentHpc(student.id, { selfReflection: val })}
                    width="100%"
                  />
                </VStack>
              </Card>

              <Card padding={3} variant="muted">
                <VStack gap={1.5}>
                  <HStack justify="between" align="center">
                    <Text type="label" color="secondary">
                      Parent Input ({student.parentLanguage})
                    </Text>
                    <Badge
                      label={student.parentVoiceSubmitted ? 'Voice received' : 'Pending'}
                      variant={student.parentVoiceSubmitted ? 'success' : 'warning'}
                    />
                  </HStack>
                  <Text type="supporting">
                    {student.parentVoiceInput ||
                      'Awaiting 20-second parent voice note via Parent Bridge.'}
                  </Text>
                </VStack>
              </Card>
            </Grid>
          </VStack>
        </Card>
      </Grid>
    </VStack>
  );
}
