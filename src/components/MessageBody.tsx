import { useMemo } from 'react';
import { Linking, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import RenderHTML from 'react-native-render-html';
import { normalizeMessageLink } from '@/data/messageHtml';
import { colors, spacing } from '@/theme';

const ignoredDomTags = ['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'base', 'form', 'input', 'button', 'textarea', 'select', 'option', 'img', 'video', 'audio', 'source', 'canvas', 'svg', 'math'];
const baseStyle = { color: colors.text, fontSize: 16, lineHeight: 25 } as const;
const tagsStyles = {
  body: { margin: 0 },
  p: { marginTop: 0, marginBottom: 12 },
  a: { color: colors.blue, textDecorationLine: 'underline' },
  h1: { color: colors.navy, fontSize: 22, lineHeight: 28, marginTop: 16, marginBottom: 10 },
  h2: { color: colors.navy, fontSize: 20, lineHeight: 26, marginTop: 16, marginBottom: 10 },
  h3: { color: colors.navy, fontSize: 18, lineHeight: 24, marginTop: 14, marginBottom: 8 },
  blockquote: { borderLeftColor: colors.border, borderLeftWidth: 3, paddingLeft: 12, marginLeft: 0 },
} as const;
const defaultTextProps = { selectable: true } as const;

async function openMessageLink(_event: GestureResponderEvent, href: string) {
  const link = normalizeMessageLink(href);
  if (!link) return;
  await Linking.openURL(link).catch(() => undefined);
}

const renderersProps = { a: { onPress: openMessageLink } } as const;

export function MessageBody({ html }: { html: string }) {
  const { width } = useWindowDimensions();
  const source = useMemo(() => ({ html }), [html]);
  return <RenderHTML contentWidth={Math.max(0, width - spacing.lg * 2)} source={source} baseStyle={baseStyle} tagsStyles={tagsStyles} defaultTextProps={defaultTextProps} enableCSSInlineProcessing={false} ignoredDomTags={ignoredDomTags} renderersProps={renderersProps} />;
}
