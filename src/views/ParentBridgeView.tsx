import { useEffect, useState } from 'react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Selector } from '@astryxdesign/core/Selector';
import { Divider } from '@astryxdesign/core/Divider';
import { List, ListItem } from '@astryxdesign/core/List';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Banner } from '@astryxdesign/core/Banner';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Volume2, Square, Copy, Check, MessageSquareReply, Send } from 'lucide-react';
import type { ParentLanguage, StudentRecord } from '../data/schoolData';
import {
  buildVernacularParentMessage,
  speakVernacularText,
  stopSpeaking,
} from '../engine/voiceHpcParser';

interface ParentBridgeViewProps {
  students: StudentRecord[];
  onRecordParentReply: (studentId: string, replyText: string) => void;
}

const LANGUAGES: ParentLanguage[] = [
  'Hindi',
  'Hinglish',
  'Marathi',
  'Tamil',
  'Telugu',
  'Bengali',
  'English',
];

export function ParentBridgeView({
  students,
  onRecordParentReply,
}: ParentBridgeViewProps) {
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id ?? '');
  const student = students.find((s) => s.id === selectedStudentId) ?? students[0];
  const [overrideLang, setOverrideLang] = useState<ParentLanguage>(student.parentLanguage);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Record<string, boolean>>({});
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);
  const [replyDraft, setReplyDraft] = useState('');

  useEffect(() => {
    setOverrideLang(student.parentLanguage);
    stopSpeaking();
    setIsPlaying(false);
  }, [student.id, student.parentLanguage]);

  useEffect(() => () => stopSpeaking(), []);

  const message = buildVernacularParentMessage(student, overrideLang);

  const handleTogglePlay = () => {
    if (isPlaying) {
      stopSpeaking();
      setIsPlaying(false);
      return;
    }
    const ok = speakVernacularText(message.script, message.speechLangCode, () =>
      setIsPlaying(false),
    );
    if (ok) setIsPlaying(true);
  };

  const handleCopyWhatsApp = async () => {
    const formatted = `${message.greeting}\n\n${message.script}\n\n${message.homeActivity}`;
    try {
      await navigator.clipboard.writeText(formatted);
    } catch {
      // Clipboard fallback ignored quietly
    }
    setCopiedId(student.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <VStack gap={5} padding={6} maxWidth={1480}>
      {/* Page Header */}
      <HStack justify="between" align="end" wrap="wrap" gap={3}>
        <VStack gap={1}>
          <Heading level={1} weight="medium">
            Parent Voice Bridge
          </Heading>
          <Text color="secondary">
            Send warm 45-second regional voice notes via WhatsApp—no parent app download, no personal number sharing
          </Text>
        </VStack>

        <HStack gap={2}>
          <Selector
            label="Language"
            isLabelHidden
            value={overrideLang}
            onChange={(val) => val && setOverrideLang(val as ParentLanguage)}
            options={LANGUAGES.map((lang) => ({ value: lang, label: lang }))}
            width={160}
          />
          <Button
            label="Simulate parent voice reply"
            variant="secondary"
            icon={<MessageSquareReply size={16} strokeWidth={1.5} />}
            onClick={() => {
              setReplyDraft(
                student.parentVoiceInput ||
                  'Humne aaj shaam 10 minute Aarav ke saath minus sign wale 3 sawal solve kiye, ab usse confidence aa raha hai.',
              );
              setIsReplyDialogOpen(true);
            }}
          />
        </HStack>
      </HStack>

      <Grid columns={{ minWidth: 360, max: 2 }} gap={5} align="start">
        {/* LEFT: Student Roster for Weekly Bridge */}
        <Card padding={4} variant="default">
          <VStack gap={3}>
            <HStack justify="between" align="center">
              <Heading level={3} weight="medium">
                Class 7B families
              </Heading>
              <Text type="supporting" color="secondary" hasTabularNumbers>
                {students.filter((s) => s.parentVoiceSubmitted).length}/{students.length} HPC replies in
              </Text>
            </HStack>

            <List hasDividers density="balanced">
              {students.map((st) => {
                const isSelected = st.id === student.id;
                const isSent = Boolean(sentIds[st.id]);
                return (
                  <ListItem
                    key={st.id}
                    label={`${st.name} · ${st.parentName}`}
                    description={`${st.parentLanguage} · ${st.parentPhone}`}
                    isSelected={isSelected}
                    endContent={
                      <HStack gap={1.5} align="center">
                        {isSent ? <Badge label="Sent" variant="success" /> : null}
                        <Badge
                          label={st.parentVoiceSubmitted ? 'HPC synced' : 'Reply pending'}
                          variant={st.parentVoiceSubmitted ? 'neutral' : 'warning'}
                        />
                      </HStack>
                    }
                    onClick={() => setSelectedStudentId(st.id)}
                  />
                );
              })}
            </List>
          </VStack>
        </Card>

        {/* RIGHT: Live Vernacular Voice Card + WhatsApp Preview */}
        <VStack gap={4}>
          <Card padding={5} variant="default">
            <VStack gap={4}>
              <HStack justify="between" align="start" wrap="wrap" gap={2}>
                <VStack gap={0.5} className="sl-margin-rule">
                  <Text type="supporting" color="secondary">
                    WhatsApp Official School Channel · {message.language}
                  </Text>
                  <Heading level={3} weight="medium">
                    {message.greeting}
                  </Heading>
                  <Text type="supporting" color="secondary">
                    To {student.parentName} ({student.parentPhone}) · Teacher number stays private
                  </Text>
                </VStack>
                <Badge label={`~${message.durationSec}s audio`} variant="neutral" />
              </HStack>

              {/* Playable Audio Strip */}
              <Card padding={3} variant="muted">
                <HStack justify="between" align="center" gap={3} wrap="wrap">
                  <HStack gap={3} align="center">
                    <Button
                      label={isPlaying ? 'Stop audio' : `Play ${message.language} voice note`}
                      variant="primary"
                      size="sm"
                      icon={
                        isPlaying ? (
                          <Square size={16} strokeWidth={1.5} />
                        ) : (
                          <Volume2 size={16} strokeWidth={1.5} />
                        )
                      }
                      onClick={handleTogglePlay}
                    />
                    <HStack gap={1.5} align="center">
                      <StatusDot
                        variant={isPlaying ? 'accent' : 'neutral'}
                        isPulsing={isPlaying}
                        label={isPlaying ? 'Speaking' : 'Ready'}
                      />
                      <Text type="supporting" color="secondary" hasTabularNumbers>
                        {isPlaying ? 'Playing regional audio' : `0:00 / 0:${message.durationSec}`}
                      </Text>
                    </HStack>
                  </HStack>

                  <Text type="supporting" color="secondary" className="sl-mono">
                    {message.speechLangCode}
                  </Text>
                </HStack>
              </Card>

              {/* Full Spoken Script */}
              <VStack gap={1.5}>
                <Text type="label" color="secondary">
                  Spoken voice script
                </Text>
                <Text>{message.script}</Text>
              </VStack>

              <Divider />

              {/* Tonight's 10-Minute Home Habit */}
              <VStack gap={1}>
                <Text type="label" color="secondary">
                  10-minute home habit (zero textbook jargon)
                </Text>
                <Text weight="medium">{message.homeActivity}</Text>
              </VStack>

              <Divider />

              {/* Actions */}
              <HStack justify="between" align="center" wrap="wrap" gap={2}>
                <Button
                  label={copiedId === student.id ? 'Copied text' : 'Copy WhatsApp message'}
                  variant="secondary"
                  icon={
                    copiedId === student.id ? (
                      <Check size={16} strokeWidth={1.5} />
                    ) : (
                      <Copy size={16} strokeWidth={1.5} />
                    )
                  }
                  onClick={handleCopyWhatsApp}
                />

                <Button
                  label={sentIds[student.id] ? 'Dispatched to WhatsApp' : 'Send weekly voice note'}
                  variant="primary"
                  icon={<Send size={16} strokeWidth={1.5} />}
                  onClick={() => setSentIds({ ...sentIds, [student.id]: true })}
                />
              </HStack>

              {sentIds[student.id] ? (
                <Banner
                  status="success"
                  title={`Weekly ${message.language} voice card queued for ${student.parentName}`}
                  description="Delivered with a 1-tap voice reply button that updates the mandatory Parent Input section of the NEP 2020 HPC."
                />
              ) : null}
            </VStack>
          </Card>

          {/* Received Parent Reply Preview */}
          <Card padding={4} variant="muted">
            <VStack gap={2}>
              <HStack justify="between" align="center">
                <Text weight="medium">Latest parent voice input (synced to NEP HPC)</Text>
                <Badge
                  label={student.parentVoiceSubmitted ? 'Synced to HPC' : 'Waiting for reply'}
                  variant={student.parentVoiceSubmitted ? 'success' : 'warning'}
                />
              </HStack>
              <Text type="supporting" color="secondary">
                {student.parentVoiceInput ||
                  'No parent reply logged yet. Click "Simulate parent voice reply" above to see how a parent audio note updates the student HPC automatically.'}
              </Text>
            </VStack>
          </Card>
        </VStack>
      </Grid>

      {/* Parent Voice Reply Simulation Dialog */}
      <Dialog
        isOpen={isReplyDialogOpen}
        onOpenChange={setIsReplyDialogOpen}
        width={520}
        padding={5}
        purpose="form"
      >
        <VStack gap={4}>
          <DialogHeader
            title={`Parent voice reply — ${student.parentName}`}
            subtitle={`Spoken in ${student.parentLanguage} · Automatically transcribes into ${student.name}'s NEP Holistic Progress Card`}
            onOpenChange={setIsReplyDialogOpen}
          />

          <TextArea
            label="Transcribed parent voice message"
            rows={4}
            value={replyDraft}
            onChange={setReplyDraft}
            width="100%"
          />

          <HStack justify="end" gap={2}>
            <Button
              label="Cancel"
              variant="secondary"
              onClick={() => setIsReplyDialogOpen(false)}
            />
            <Button
              label="Save to student HPC"
              variant="primary"
              isDisabled={!replyDraft.trim()}
              onClick={() => {
                onRecordParentReply(student.id, replyDraft.trim());
                setIsReplyDialogOpen(false);
              }}
            />
          </HStack>
        </VStack>
      </Dialog>
    </VStack>
  );
}
