/**
 * 高亮文本中的指定关键词。
 * @param text 需要高亮的原始文本
 * @param highlightTerms 需要高亮的关键词数组
 * @param keepClass 高亮时使用的 CSS 类名
 * @returns 高亮后的 HTML 字符串
 */
export function highlightText(
  text: string,
  highlightTerms: string[],
  keepClass: string
) {
  if (!highlightTerms.length) return text;

  let result = text;
  const sortedTerms = [...highlightTerms].sort((a, b) => b.length - a.length);

  for (const term of sortedTerms) {
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    result = result.replace(
      regex,
      (match) => `<span class="${keepClass}">${match}</span>`
    );
  }

  return result;
}
