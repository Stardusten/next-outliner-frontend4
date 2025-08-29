/**
 * 检查字体是否可用
 * @param fontNames 字体名称数组
 * @returns 布尔数组，表示对应位置的字体是否可用
 */
export function checkFontAvailability(fontNames: string[]): boolean[] {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return fontNames.map(() => false);
  }

  // 测试文本
  const testText = "AbCdEfGh中文あいうえお";
  const fallbackFont = "monospace";
  const fontSize = "16px";

  // 获取fallback字体的测量结果作为基准
  context.font = `${fontSize} ${fallbackFont}`;
  const fallbackWidth = context.measureText(testText).width;

  return fontNames.map((fontName) => {
    // 测试目标字体
    context.font = `${fontSize} "${fontName}", ${fallbackFont}`;
    const testWidth = context.measureText(testText).width;

    // 如果宽度不同，说明字体可用
    return testWidth !== fallbackWidth;
  });
}

/**
 * 常用字体列表
 */
export const COMMON_FONTS = [
  // 系统常见字体
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Courier New",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Georgia",
  "Impact",
  "Palatino Linotype",
  "Century Gothic",
  "Gill Sans",
  "Lucida Sans Unicode",
  "Lucida Console",
  "Comic Sans MS",
  "Arial Black",
  "Garamond",
  "Franklin Gothic Medium",
  "Book Antiqua",
  "Calibri",
  "Cambria",
  "Candara",
  "Consolas",
  "Constantia",
  "Corbel",
  "Segoe UI",
  "Segoe Print",
  "Segoe Script",
  "Optima",
  "Rockwell",
  "Baskerville",
  "Didot",
  "Futura",
  "Geneva",
  "Courier",
  "Brush Script MT",
  "Hobo Std",
  "Papyrus",
  "MS Serif",
  "MS Sans Serif",

  // Google Fonts 常用字体
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Source Sans Pro",
  "Poppins",
  "Raleway",
  "Merriweather",
  "Nunito",
  "Playfair Display",
  "Ubuntu",
  "Noto Sans",
  "Oswald",
  "PT Sans",
  "PT Serif",
  "Work Sans",
  "Cabin",
  "Quicksand",
  "Josefin Sans",
  "Droid Sans",
  "Inconsolata",
  "Lobster",
  "Pacifico",
  "Indie Flower",
  "Amatic SC",
  "Anton",
  "Abril Fatface",
  "Bitter",
  "Dancing Script",
  "Exo 2",
  "Fjalla One",
  "Karla",
  "Mulish",
  "Righteous",
  "Satisfy",
  "Shadows Into Light",
  "Signika",
  "Slabo 27px",
  "Zilla Slab",
  "Overpass",

  // 中文字体
  "Microsoft YaHei",
  "SimSun",
  "SimHei",
  "FangSong",
  "NSimSun",
  "STXihei",
  "STKaiti",
  "STSong",
  "STZhongsong",
  "STHupo",
  "STXinwei",
  "STLiti",
  "FangSong_GB2312",
  "YouYuan",
  "FZHei-B01S",
  "FZShuSong-Z01",
  "Source Han Sans",
  "Source Han Serif",

  // 特殊用途字体
  "Monospace",
  "Cursive",
  "Fantasy",
  "Serif",
  "Sans-serif",
];
