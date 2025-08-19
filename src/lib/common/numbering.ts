import { NumberFormat } from "./types";

// 阿拉伯数字加点，如 1. 2. 3.
const numberSuccessors_1dot = {
  "1.": "2.",
  "2.": "3.",
  "3.": "4.",
  "4.": "5.",
  "5.": "6.",
  "6.": "7.",
  "7.": "8.",
  "8.": "9.",
  "9.": "10.",
  "10.": "11.",
};

// 阿拉伯数字加右括号，如 1) 2) 3)
const numberSuccessors_1paren = {
  "1)": "2)",
  "2)": "3)",
  "3)": "4)",
  "4)": "5)",
  "5)": "6)",
  "6)": "7)",
  "7)": "8)",
  "8)": "9)",
  "9)": "10)",
  "10)": "11)",
};

// 阿拉伯数字带括号，如 (1) (2) (3)
const numberSuccessors_paren1 = {
  "(1)": "(2)",
  "(2)": "(3)",
  "(3)": "(4)",
  "(4)": "(5)",
  "(5)": "(6)",
  "(6)": "(7)",
  "(7)": "(8)",
  "(8)": "(9)",
  "(9)": "(10)",
  "(10)": "(11)",
};

// 小写字母加点，如 a. b. c.
const numberSuccessors_adot = {
  "a.": "b.",
  "b.": "c.",
  "c.": "d.",
  "d.": "e.",
  "e.": "f.",
  "f.": "g.",
  "g.": "h.",
  "h.": "i.",
  "i.": "j.",
  "j.": "k.",
};

// 小写字母加右括号，如 a) b) c)
const numberSuccessors_aparen = {
  "a)": "b)",
  "b)": "c)",
  "c)": "d)",
  "d)": "e)",
  "e)": "f)",
  "f)": "g)",
  "g)": "h)",
  "h)": "i)",
  "i)": "j)",
  "j)": "k)",
};

// 小写字母带括号，如 (a) (b) (c)
const numberSuccessors_parena = {
  "(a)": "(b)",
  "(b)": "(c)",
  "(c)": "(d)",
  "(d)": "(e)",
  "(e)": "(f)",
  "(f)": "(g)",
  "(g)": "(h)",
  "(h)": "(i)",
  "(i)": "(j)",
  "(j)": "(k)",
};

// 大写罗马数字加点，如 I. II. III.
const numberSuccessors_RomanDot = {
  "I.": "II.",
  "II.": "III.",
  "III.": "IV.",
  "IV.": "V.",
  "V.": "VI.",
  "VI.": "VII.",
  "VII.": "VIII.",
  "VIII.": "IX.",
  "IX.": "X.",
  "X.": "XI.",
};

// 大写罗马数字加右括号，如 I) II) III)
const numberSuccessors_RomanParen = {
  "I)": "II)",
  "II)": "III)",
  "III)": "IV)",
  "IV)": "V)",
  "V)": "VI)",
  "VI)": "VII)",
  "VII)": "VIII)",
  "VIII)": "IX)",
  "IX)": "X)",
  "X)": "XI)",
};

// 大写罗马数字带括号，如 (I) (II) (III)
const numberSuccessors_parenRoman = {
  "(I)": "(II)",
  "(II)": "(III)",
  "(III)": "(IV)",
  "(IV)": "(V)",
  "(V)": "(VI)",
  "(VI)": "(VII)",
  "(VII)": "(VIII)",
  "(VIII)": "(IX)",
  "(IX)": "(X)",
  "(X)": "(XI)",
};

// 小写罗马数字加点，如 i. ii. iii.
const numberSuccessors_romanDot = {
  "i.": "ii.",
  "ii.": "iii.",
  "iii.": "iv.",
  "iv.": "v.",
  "v.": "vi.",
  "vi.": "vii.",
  "vii.": "viii.",
  "viii.": "ix.",
  "ix.": "x.",
  "x.": "xi.",
};

// 小写罗马数字加右括号，如 i) ii) iii)
const numberSuccessors_romanParen = {
  "i)": "ii)",
  "ii)": "iii)",
  "iii)": "iv)",
  "iv)": "v)",
  "v)": "vi)",
  "vi)": "vii)",
  "vii)": "viii)",
  "viii)": "ix)",
  "ix)": "x)",
  "x)": "xi)",
};

// 小写罗马数字带括号，如 (i) (ii) (iii)
const numberSuccessors_parenroman = {
  "(i)": "(ii)",
  "(ii)": "(iii)",
  "(iii)": "(iv)",
  "(iv)": "(v)",
  "(v)": "(vi)",
  "(vi)": "(vii)",
  "(vii)": "(viii)",
  "(viii)": "(ix)",
  "(ix)": "(x)",
  "(x)": "(xi)",
};

// 中文数字加顿号，如 一、 二、 三、
const numberSuccessors_zh = {
  "一、": "二、",
  "二、": "三、",
  "三、": "四、",
  "四、": "五、",
  "五、": "六、",
  "六、": "七、",
  "七、": "八、",
  "八、": "九、",
  "九、": "十、",
  "十、": "十一、",
};

// 中文数字带括号，如 (一) (二) (三)
const numberSuccessors_parenzh = {
  "(一)": "(二)",
  "(二)": "(三)",
  "(三)": "(四)",
  "(四)": "(五)",
  "(五)": "(六)",
  "(六)": "(七)",
  "(七)": "(八)",
  "(八)": "(九)",
  "(九)": "(十)",
  "(十)": "(十一)",
};

const format2successors = {
  "1.": numberSuccessors_1dot,
  "1)": numberSuccessors_1paren,
  "(1)": numberSuccessors_paren1,
  "a.": numberSuccessors_adot,
  "a)": numberSuccessors_aparen,
  "(a)": numberSuccessors_parena,
  "I.": numberSuccessors_RomanDot,
  "I)": numberSuccessors_RomanParen,
  "(I)": numberSuccessors_parenRoman,
  "i.": numberSuccessors_romanDot,
  "i)": numberSuccessors_romanParen,
  "(i)": numberSuccessors_parenroman,
  "一、": numberSuccessors_zh,
  "(一)": numberSuccessors_parenzh,
} as const;

export function nextNumber(
  format: NumberFormat,
  curr: string | null
): string | null {
  const successors = format2successors[format] as any;
  if (!successors) return null;
  if (curr == null) return successors[format] ?? null;
  return successors[curr] ?? null;
}
