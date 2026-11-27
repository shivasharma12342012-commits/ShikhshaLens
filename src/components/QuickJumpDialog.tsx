import { useMemo, useState } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { TextInput } from '@astryxdesign/core/TextInput';
import { List, ListItem } from '@astryxdesign/core/List';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Kbd } from '@astryxdesign/core/Kbd';
import {
  ScanLine,
  Mic,
  Target,
  Volume2,
  ShieldCheck,
  Settings,
  User,
} from 'lucide-react';
import type { StudentRecord } from '../data/schoolData';

export type NavDestination = 'paper' | 'hpc' | 'remediation' | 'parents' | 'radar';

interface QuickJumpDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  students: StudentRecord[];
  onNavigate: (dest: NavDestination) => void;
  onOpenSettings: () => void;
}

export function QuickJumpDialog({
  isOpen,
  onOpenChange,
  students,
  onNavigate,
  onOpenSettings,
}: QuickJumpDialogProps) {
  const [query, setQuery] = useState('');

  const items = useMemo(() => {
    const base = [
      {
        id: 'nav-paper',
        label: 'Paper Studio',
        description: 'Scan and check handwritten Indian exam sheets',
        category: 'Workspace',
        icon: <ScanLine size={16} strokeWidth={1.5} />,
        action: () => onNavigate('paper'),
      },
      {
        id: 'nav-hpc',
        label: 'Voice-to-HPC Studio',
        description: 'Speak 30-second observations into NEP 2020 progress cards',
        category: 'Workspace',
        icon: <Mic size={16} strokeWidth={1.5} />,
        action: () => onNavigate('hpc'),
      },
      {
        id: 'nav-remediation',
        label: "Tomorrow's 10-Minute Fix",
        description: 'Class Concept Heatmap and TaRL 3-tier practice groups',
        category: 'Workspace',
        icon: <Target size={16} strokeWidth={1.5} />,
        action: () => onNavigate('remediation'),
      },
      {
        id: 'nav-parents',
        label: 'Parent Voice Bridge',
        description: 'Regional WhatsApp audio cards in 7 Indian languages',
        category: 'Workspace',
        icon: <Volume2 size={16} strokeWidth={1.5} />,
        action: () => onNavigate('parents'),
      },
      {
        id: 'nav-radar',
        label: "Principal's Live Radar",
        description: 'At-risk student tracking and APAAR / UDISE+ audit',
        category: 'Workspace',
        icon: <ShieldCheck size={16} strokeWidth={1.5} />,
        action: () => onNavigate('radar'),
      },
      {
        id: 'act-settings',
        label: 'Engine & school settings',
        description: 'Switch between offline OCR and Gemini Vision API key',
        category: 'Settings',
        icon: <Settings size={16} strokeWidth={1.5} />,
        action: () => onOpenSettings(),
      },
      ...students.map((st) => ({
        id: `st-${st.id}`,
        label: `${st.name} (Roll ${st.rollNo})`,
        description: `${st.className} · ${st.recentScorePct}% · ${st.tarlTier} · ${st.parentLanguage}`,
        category: 'Student',
        icon: <User size={16} strokeWidth={1.5} />,
        action: () => onNavigate('radar'),
      })),
    ];

    const q = query.trim().toLowerCase();
    if (!q) return base.slice(0, 8);
    return base.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q),
    );
  }, [query, students, onNavigate, onOpenSettings]);

  const handleOpenChange = (open: boolean) => {
    if (!open) setQuery('');
    onOpenChange(open);
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={handleOpenChange} width={540} padding={4} purpose="info">
      <VStack gap={3}>
        <DialogHeader
          title="Quick jump"
          subtitle="Move across workspaces, students, or paper-checking settings"
          onOpenChange={handleOpenChange}
        />

        <TextInput
          label="Search"
          isLabelHidden
          placeholder="Search"
          value={query}
          onChange={setQuery}
          hasAutoFocus
          hasClear
          width="100%"
        />

        <VStack isScrollable style={{ maxHeight: '44dvh' }}>
          {items.length === 0 ? (
            <Text color="secondary">No matching workspaces or students</Text>
          ) : (
            <List hasDividers density="compact">
              {items.map((item) => (
                <ListItem
                  key={item.id}
                  label={item.label}
                  description={item.description}
                  startContent={item.icon}
                  endContent={<Badge label={item.category} variant="neutral" />}
                  onClick={() => {
                    item.action();
                    handleOpenChange(false);
                  }}
                />
              ))}
            </List>
          )}
        </VStack>

        <HStack justify="between" align="center">
          <Text type="supporting" color="secondary">
            Press Esc to close
          </Text>
          <Kbd keys="Ctrl+K" />
        </HStack>
      </VStack>
    </Dialog>
  );
}
