import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { TextStyle } from '@react-pdf/stylesheet';
import type { TranscriptTurn } from '@/lib/transcript/grouping';
import type { Speaker, SpeakerId } from '@/lib/transcript/model';
import { colorForIndex } from '@/lib/transcript/speaker-colors';
import { formatTimestamp } from '@/lib/transcript/formatting';
import { parseInlineSegments, parseMarkdownBlocks } from '@/lib/markdown/parse';

// Palette from PLAN.md section 13. @react-pdf/renderer ships Helvetica as a
// built-in font (no registration needed) — sans-serif like the app's own
// Inter, matching the "no serif anywhere" rule even without embedding fonts.
const COLORS = {
  text: '#0F1729',
  textSecondary: '#4A5468',
  textMuted: '#8A94A6',
  border: '#E3E6EC',
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontSize: 10,
    color: COLORS.text,
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  metaRow: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginTop: 16,
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
  },
  summaryHeading: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginTop: 10,
    marginBottom: 4,
  },
  summaryBullet: {
    fontSize: 10,
    color: COLORS.textSecondary,
    lineHeight: 1.4,
    marginBottom: 3,
    paddingLeft: 10,
  },
  summaryParagraph: {
    fontSize: 10,
    color: COLORS.textSecondary,
    lineHeight: 1.4,
    marginBottom: 4,
  },
  turn: {
    marginBottom: 12,
  },
  turnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  speakerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  speakerName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  timestamp: {
    fontSize: 8,
    color: COLORS.textMuted,
    marginLeft: 6,
    fontFamily: 'Courier', // built-in monospace — stands in for JetBrains Mono
  },
  turnText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    lineHeight: 1.5,
  },
  bold: {
    fontFamily: 'Helvetica-Bold',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    textAlign: 'center',
    fontSize: 8,
    color: COLORS.textMuted,
  },
});

/** Renders "**bold**" spans as nested styled <Text>, the standard react-pdf inline-formatting pattern. */
function InlineText({ text, style }: { text: string; style: TextStyle }) {
  return (
    <Text style={style}>
      {parseInlineSegments(text).map((seg, i) =>
        seg.bold ? (
          <Text key={i} style={styles.bold}>
            {seg.text}
          </Text>
        ) : (
          <Text key={i}>{seg.text}</Text>
        ),
      )}
    </Text>
  );
}

function SummaryBlocks({ markdown }: { markdown: string }) {
  return (
    <>
      {parseMarkdownBlocks(markdown).map((block, i) => {
        if (block.type === 'heading') {
          return (
            <InlineText key={i} text={block.text} style={styles.summaryHeading} />
          );
        }
        if (block.type === 'bullet') {
          return <InlineText key={i} text={`•  ${block.text}`} style={styles.summaryBullet} />;
        }
        return <InlineText key={i} text={block.text} style={styles.summaryParagraph} />;
      })}
    </>
  );
}

export interface TranscriptPDFProps {
  title: string;
  dateLabel: string;
  durationLabel: string;
  participants: string[];
  turns: TranscriptTurn[];
  speakers: Record<SpeakerId, Speaker>;
  includeTimestamps: boolean;
  /** Omit (null) to export transcript-only. */
  summary: string | null;
}

export function TranscriptPDF({
  title,
  dateLabel,
  durationLabel,
  participants,
  turns,
  speakers,
  includeTimestamps,
  summary,
}: TranscriptPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.metaRow}>
          {dateLabel} · {durationLabel}
        </Text>
        <Text style={styles.metaRow}>
          Participants: {participants.length > 0 ? participants.join(', ') : 'None'}
        </Text>

        {summary && (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionHeading}>Summary</Text>
            <SummaryBlocks markdown={summary} />
          </>
        )}

        <View style={styles.divider} />
        <Text style={styles.sectionHeading}>Transcript</Text>

        {turns.map((turn, i) => {
          const speaker = speakers[turn.speakerId];
          const text = turn.words.map((w) => w.text).join(' ');
          return (
            <View key={i} style={styles.turn} wrap={false}>
              <View style={styles.turnHeader}>
                <View
                  style={[styles.speakerDot, { backgroundColor: colorForIndex(speaker?.colorIndex ?? 0) }]}
                />
                <Text style={styles.speakerName}>{speaker?.label ?? 'Unknown speaker'}</Text>
                {includeTimestamps && (
                  <Text style={styles.timestamp}>{formatTimestamp(turn.words[0]?.start ?? 0)}</Text>
                )}
              </View>
              <InlineText text={text} style={styles.turnText} />
            </View>
          );
        })}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
