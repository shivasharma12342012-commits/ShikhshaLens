import { useState } from 'react';
import { Drawer } from '@astryxdesign/core/Drawer';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { TabList, Tab } from '@astryxdesign/core/TabList';
import { Table } from '@astryxdesign/core/Table';
import { X, Layers, ScanText, GitBranch, Cpu } from 'lucide-react';
import type { PaperCheckReport } from '../engine/paperChecker';

interface PipelineInspectorDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  report: PaperCheckReport | null;
}

export function PipelineInspectorDrawer({
  isOpen,
  onOpenChange,
  report,
}: PipelineInspectorDrawerProps) {
  const [activeTab, setActiveTab] = useState('stages');
  const [layerView, setLayerView] = useState<'original' | 'cleaned' | 'binarized'>('cleaned');

  const ocrRows =
    report?.rawLines.map((line, index) => ({
      id: `line-${index}`,
      lineNo: `#${index + 1}`,
      text: line.text,
      confidence: `${line.confidence}%`,
      region: `y:${line.bboxPct.y}%`,
    })) ?? [];

  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      label="How ShikshaLens checks a paper"
      side="end"
      width={560}
      padding={5}
    >
      <VStack gap={4}>
        <HStack justify="between" align="start">
          <VStack gap={1}>
            <Heading level={3} weight="medium">
              How the app checks a paper
            </Heading>
            <Text type="supporting" color="secondary">
              Transparent 5-stage computer vision, OCR, and CBSE step-marking pipeline
            </Text>
          </VStack>
          <Button
            label="Close inspector"
            variant="ghost"
            size="sm"
            isIconOnly
            icon={<X size={16} strokeWidth={1.5} />}
            onClick={() => onOpenChange(false)}
          />
        </HStack>

        <TabList value={activeTab} onChange={setActiveTab} hasDivider>
          <Tab value="stages" label="5-stage flow" icon={<Cpu size={16} strokeWidth={1.5} />} />
          <Tab value="vision" label="Vision layers" icon={<Layers size={16} strokeWidth={1.5} />} />
          <Tab value="ocr" label="Extracted ink" icon={<ScanText size={16} strokeWidth={1.5} />} />
          <Tab value="graph" label="Concept X-Ray" icon={<GitBranch size={16} strokeWidth={1.5} />} />
        </TabList>

        {activeTab === 'stages' ? (
          <VStack gap={3}>
            <VStack gap={1} className="sl-margin-rule">
              <Text weight="medium">1. Ruled-notebook line suppression (Canvas CV)</Text>
              <Text type="supporting" color="secondary">
                Indian answer sheets have horizontal blue lines and double red vertical margins that confuse ordinary scanners. Our pixel filter separates pale blue rules and red margins from dark pen ink before OCR reads the sheet.
                {report ? ` Suppressed ${report.layers.ruledPixelsSuppressedPct}% background rule pixels on this sheet.` : ''}
              </Text>
            </VStack>
            <Divider />

            <VStack gap={1} className="sl-margin-rule">
              <Text weight="medium">2. Adaptive Otsu thresholding and line banding</Text>
              <Text type="supporting" color="secondary">
                Handles classroom tube-light glare and phone shadows by computing an adaptive ink cutoff, then scans horizontal ink density to locate each written answer band.
                {report ? ` Detected ${report.layers.inkBands.length} active ink bands.` : ''}
              </Text>
            </VStack>
            <Divider />

            <VStack gap={1} className="sl-margin-rule">
              <Text weight="medium">3. Dual recognition engine (Offline OCR or Gemini Vision)</Text>
              <Text type="supporting" color="secondary">
                Runs Tesseract.js WebAssembly right inside the browser to pull text plus pixel bounding boxes, merging left-margin labels like Q1 with their answer row—or routes to Gemini 2.5 Flash Vision when an API key is added for cursive and Hindi/regional scripts.
              </Text>
            </VStack>
            <Divider />

            <VStack gap={1} className="sl-margin-rule">
              <Text weight="medium">4. CBSE step-wise partial credit and misconception traps</Text>
              <Text type="supporting" color="secondary">
                Splits extracted lines by question (Q1, Q2, Q3) and evaluates every intermediate step independently—awarding partial credit for correct expansions and catching traps like Sign-Transposition (15 - 12 instead of 15 + 12) or adding denominators straight across (2/5).
              </Text>
            </VStack>
            <Divider />

            <VStack gap={1} className="sl-margin-rule">
              <Text weight="medium">5. Human-in-the-loop audit and NCERT prerequisite trace</Text>
              <Text type="supporting" color="secondary">
                Any step below 78% confidence enters the Teacher Eye queue for 1-tap override. Lost steps automatically walk backward through the NCERT prerequisite graph to locate the root foundational gap.
              </Text>
            </VStack>

            {report ? (
              <>
                <Divider />
                <HStack justify="between" align="center">
                  <Text type="supporting" color="secondary">
                    Last run engine: {report.engineUsed}
                  </Text>
                  <Text type="supporting" color="secondary" hasTabularNumbers>
                    {report.durationMs} ms · {report.avgConfidence}% avg confidence
                  </Text>
                </HStack>
              </>
            ) : null}
          </VStack>
        ) : null}

        {activeTab === 'vision' ? (
          report ? (
            <VStack gap={3}>
              <HStack gap={2}>
                <Button
                  label="Original sheet"
                  size="sm"
                  variant={layerView === 'original' ? 'primary' : 'secondary'}
                  onClick={() => setLayerView('original')}
                />
                <Button
                  label="Ruled lines removed"
                  size="sm"
                  variant={layerView === 'cleaned' ? 'primary' : 'secondary'}
                  onClick={() => setLayerView('cleaned')}
                />
                <Button
                  label="Binarized ink"
                  size="sm"
                  variant={layerView === 'binarized' ? 'primary' : 'secondary'}
                  onClick={() => setLayerView('binarized')}
                />
              </HStack>

              <VStack className="sl-paper-stage">
                <img
                  src={
                    layerView === 'original'
                      ? report.layers.originalDataUrl
                      : layerView === 'cleaned'
                        ? report.layers.linesRemovedDataUrl
                        : report.layers.binarizedDataUrl
                  }
                  alt={`Preprocessed exam sheet (${layerView})`}
                />
              </VStack>

              <HStack justify="between">
                <Text type="supporting" color="secondary">
                  Resolution: {report.layers.width} × {report.layers.height} px
                </Text>
                <Text type="supporting" color="secondary" hasTabularNumbers>
                  Rule pixels removed: {report.layers.ruledPixelsSuppressedPct}% · Ink bands:{' '}
                  {report.layers.inkBands.length}
                </Text>
              </HStack>
            </VStack>
          ) : (
            <Text color="secondary">Run a paper check first to inspect live preprocessed CV layers.</Text>
          )
        ) : null}

        {activeTab === 'ocr' ? (
          report ? (
            <VStack gap={3}>
              <Text type="supporting" color="secondary">
                Exact lines read from the cleaned image pixels with per-line confidence and vertical sheet position.
              </Text>
              <Table
                data={ocrRows}
                idKey="id"
                density="compact"
                hasHover
                columns={[
                  { key: 'lineNo', header: 'Line' },
                  { key: 'text', header: 'Recognized text' },
                  { key: 'confidence', header: 'Conf.', align: 'end' },
                  { key: 'region', header: 'Pos.', align: 'end' },
                ]}
              />
            </VStack>
          ) : (
            <Text color="secondary">Run a paper check first to see raw recognized OCR lines.</Text>
          )
        ) : null}

        {activeTab === 'graph' ? (
          report ? (
            <VStack gap={3}>
              {report.conceptXRays.length === 0 ? (
                <Card padding={4} variant="muted">
                  <Text weight="medium">No prerequisite learning gaps detected on this sheet</Text>
                </Card>
              ) : (
                report.conceptXRays.map((trace, idx) => (
                  <Card key={idx} padding={3} variant="muted">
                    <VStack gap={2}>
                      <HStack justify="between" align="center">
                        <Text weight="medium">{trace.failedConcept.name}</Text>
                        <Badge label={trace.rootPrerequisite.grade} variant="warning" />
                      </HStack>
                      <Text type="supporting" color="secondary">
                        {trace.evidence}
                      </Text>
                      <HStack gap={2} wrap="wrap" align="center">
                        {trace.chain.map((node, i) => (
                          <HStack key={node.id} gap={1} align="center">
                            <Badge
                              label={`${node.grade}: ${node.name}`}
                              variant={i === 0 ? 'error' : 'neutral'}
                            />
                            {i < trace.chain.length - 1 ? (
                              <Text type="supporting" color="secondary">
                                ←
                              </Text>
                            ) : null}
                          </HStack>
                        ))}
                      </HStack>
                      <Text type="supporting">
                        Next-day fix: {trace.rootPrerequisite.remediationTipEn}
                      </Text>
                    </VStack>
                  </Card>
                ))
              )}
            </VStack>
          ) : (
            <Text color="secondary">Run a paper check first to trace NCERT prerequisite gaps.</Text>
          )
        ) : null}
      </VStack>
    </Drawer>
  );
}
