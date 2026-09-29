/**
 * JSON Reply Stream Extractor
 * Extracts and decodes the string value of the "reply" key in real-time
 * as raw JSON tokens arrive from the streaming LLM response.
 */
export function createJsonReplyStreamExtractor(onTextDelta: (delta: string) => void) {
  let rawBuffer = '';
  let inReply = false;
  let replyDone = false;
  let escapeNext = false;
  let unicodeBuffer: string | null = null;
  let fullReply = '';

  return {
    push(chunk: string) {
      if (replyDone) return;

      if (!inReply) {
        rawBuffer += chunk;
        const match = rawBuffer.match(/"reply"\s*:\s*"/);
        if (match && match.index !== undefined) {
          inReply = true;
          const startIndex = match.index + match[0].length;
          const remaining = rawBuffer.slice(startIndex);
          rawBuffer = '';
          this._processChars(remaining);
        }
      } else {
        this._processChars(chunk);
      }
    },

    _processChars(str: string) {
      let currentDelta = '';

      for (let i = 0; i < str.length; i++) {
        if (replyDone) break;
        const char = str[i];

        // Handle multi-character unicode escape \uXXXX across chunks
        if (unicodeBuffer !== null) {
          unicodeBuffer += char;
          if (unicodeBuffer.length === 4) {
            const codePoint = parseInt(unicodeBuffer, 16);
            if (!isNaN(codePoint)) {
              currentDelta += String.fromCharCode(codePoint);
            } else {
              currentDelta += '\\u' + unicodeBuffer;
            }
            unicodeBuffer = null;
          }
          continue;
        }

        if (escapeNext) {
          escapeNext = false;
          if (char === 'n') {
            currentDelta += '\n';
          } else if (char === 't') {
            currentDelta += '\t';
          } else if (char === 'r') {
            currentDelta += '\r';
          } else if (char === 'b') {
            currentDelta += '\b';
          } else if (char === 'f') {
            currentDelta += '\f';
          } else if (char === '"' || char === '\\' || char === '/') {
            currentDelta += char;
          } else if (char === 'u') {
            unicodeBuffer = '';
          } else {
            currentDelta += char;
          }
        } else if (char === '\\') {
          escapeNext = true;
        } else if (char === '"') {
          // Reached unescaped quote ending the "reply" string
          replyDone = true;
          break;
        } else {
          currentDelta += char;
        }
      }

      if (currentDelta) {
        fullReply += currentDelta;
        onTextDelta(currentDelta);
      }
    },

    getReply(): string {
      return fullReply;
    },

    isDone(): boolean {
      return replyDone;
    },
  };
}

/**
 * Simulates a streaming text effect for fallback responses
 */
export async function simulateStreamText(
  text: string,
  onDelta: (delta: string) => void,
  intervalMs = 20
): Promise<void> {
  // Split by words keeping whitespaces
  const words = text.match(/\S+\s*/g) || [text];
  
  for (let i = 0; i < words.length; i += 2) {
    const chunk = words.slice(i, i + 2).join('');
    onDelta(chunk);
    if (intervalMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}
