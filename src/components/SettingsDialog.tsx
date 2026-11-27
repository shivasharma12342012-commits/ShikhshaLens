import { useState } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Switch } from '@astryxdesign/core/Switch';
import { Divider } from '@astryxdesign/core/Divider';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import type { BoardType } from '../data/schoolData';

export interface AppSettings {
  board: BoardType;
  schoolName: string;
  teacherName: string;
  geminiApiKey: string;
  darkMode: boolean;
  strictStepMarking: boolean;
}

interface SettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  settings: AppSettings;
  onSave: (next: AppSettings) => void;
}

export function SettingsDialog({
  isOpen,
  onOpenChange,
  settings,
  onSave,
}: SettingsDialogProps) {
  const [draft, setDraft] = useState<AppSettings>(settings);

  const handleOpenChange = (open: boolean) => {
    if (open) setDraft(settings);
    onOpenChange(open);
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={handleOpenChange} width={540} padding={5} purpose="form">
      <VStack gap={4}>
        <DialogHeader
          title="School and paper-checking engine"
          subtitle="Configure board grading style, appearance, and optional Gemini Vision key"
          onOpenChange={handleOpenChange}
        />

        <VStack gap={3}>
          <TextInput
            label="School name"
            value={draft.schoolName}
            onChange={(value) => setDraft({ ...draft, schoolName: value })}
            width="100%"
          />

          <HStack gap={3} align="end">
            <TextInput
              label="Teacher name"
              value={draft.teacherName}
              onChange={(value) => setDraft({ ...draft, teacherName: value })}
              width="100%"
            />
            <Selector
              label="Education board"
              value={draft.board}
              onChange={(val) => {
                if (val) setDraft({ ...draft, board: val as BoardType });
              }}
              options={[
                { value: 'CBSE', label: 'CBSE (NCERT / PARAKH)' },
                { value: 'ICSE', label: 'ICSE (CISCE)' },
                { value: 'State Board', label: 'State Board (SCERT)' },
              ]}
              width="100%"
            />
          </HStack>
        </VStack>

        <Divider />

        <VStack gap={3}>
          <HStack justify="between" align="center">
            <Text weight="medium">Paper-checking recognition engine</Text>
            <Badge
              label={draft.geminiApiKey.trim() ? 'Gemini 2.5 Flash Vision' : 'On-device Tesseract OCR'}
              variant={draft.geminiApiKey.trim() ? 'success' : 'neutral'}
            />
          </HStack>

          <Banner
            status="info"
            title="Works offline with zero API key"
            description="Without a key, ShikshaLens runs real browser computer vision (blue-line removal + Otsu binarization + Tesseract.js OCR + CBSE step matching). Paste a Gemini API key to upgrade messy cursive handwriting, diagrams, and Hindi/regional scripts."
          />

          <TextInput
            label="Gemini API key"
            type="password"
            isOptional
            placeholder="AIza..."
            description="Stored locally in your browser only. Sent directly to Google Gemini API when checking a sheet."
            value={draft.geminiApiKey}
            onChange={(value) => setDraft({ ...draft, geminiApiKey: value })}
            hasClear
            width="100%"
          />

          <Switch
            label="Flag partial or low-confidence steps for teacher review"
            description="Automatically highlights any step below 78% OCR confidence in the Teacher Eye queue"
            value={draft.strictStepMarking}
            onChange={(checked) => setDraft({ ...draft, strictStepMarking: checked })}
          />

          <Switch
            label="Dark mode"
            description="Switch between warm paper light mode and quiet slate dark mode"
            value={draft.darkMode}
            onChange={(checked) => setDraft({ ...draft, darkMode: checked })}
          />
        </VStack>

        <Divider />

        <HStack justify="end" gap={2}>
          <Button label="Cancel" variant="secondary" onClick={() => handleOpenChange(false)} />
          <Button
            label="Save settings"
            variant="primary"
            onClick={() => {
              onSave(draft);
              onOpenChange(false);
            }}
          />
        </HStack>
      </VStack>
    </Dialog>
  );
}
