export const clipboard = {
  writeText(text: string) {
    try {
      navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("Failed to write text to clipboard", error);
    }
  },
  readText() {
    try {
      return navigator.clipboard.readText();
    } catch (error) {
      console.error("Failed to read text from clipboard", error);
      return "";
    }
  },
};
