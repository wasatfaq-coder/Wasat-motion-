// What counts as a borrowed room or a leftover figure, versus a part drawn for this topic.
// A scene that is mostly floor, walls and a mannequin is the motor-stand habit (PR #38). The topic's own
// subject prefixes have to be present, and the generic share stays under the configured cap.

export const GENERIC_PART = /(?:^|\.)(floor|wall|stand|bench|table|lamp|win|board|pot|hero|plinth|pad)(?:\.|$)/;

export const subjectStats = (names: string[], prefixes: string[]) => {
  const total = names.length;
  const generic = names.filter((n) => GENERIC_PART.test(n)).length;
  const hit = names.filter((n) => prefixes.some((p) => n.includes(`.${p}.`) || n.endsWith(`.${p}`))).length;
  return {total, generic, hit, genericShare: total ? generic / total : 1};
};
