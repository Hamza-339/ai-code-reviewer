export interface ParsedDiffFile {
  path: string;
  changedLines: Set<number>;
  rendered: string;
}

const HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

function stripPrefix(path: string): string {
  return path.replace(/^[ab]\//, '');
}

function renderLine(lineNumber: number | null, marker: string, content: string): string {
  return `${lineNumber ?? ''}\t${marker}${content}`;
}

export function parseDiff(diffText: string): ParsedDiffFile[] {
  const files: ParsedDiffFile[] = [];
  let currentFile: ParsedDiffFile | null = null;
  let renderedLines: string[] = [];
  let nextNewLine = 0;
  let oldPath = '';

  const flush = (): void => {
    if (currentFile) {
      currentFile.rendered = renderedLines.join('\n');
      files.push(currentFile);
    }
  };

  for (const line of diffText.split('\n')) {
    if (line.startsWith('--- ')) {
      oldPath = stripPrefix(line.slice(4));
      continue;
    }

    if (line.startsWith('+++ ')) {
      flush();
      const newPath = line.slice(4);
      currentFile = {
        path: newPath === '/dev/null' ? oldPath : stripPrefix(newPath),
        changedLines: new Set(),
        rendered: '',
      };
      renderedLines = [];
      continue;
    }

    if (!currentFile || line.startsWith('diff --git') || line.startsWith('index ')) {
      continue;
    }

    const hunkMatch = HUNK_HEADER.exec(line);
    if (hunkMatch) {
      nextNewLine = Number(hunkMatch[1]);
      renderedLines.push(line);
      continue;
    }

    if (line.startsWith('+')) {
      currentFile.changedLines.add(nextNewLine);
      renderedLines.push(renderLine(nextNewLine, '+', line.slice(1)));
      nextNewLine++;
    } else if (line.startsWith('-')) {
      renderedLines.push(renderLine(null, '-', line.slice(1)));
    } else if (line.startsWith(' ')) {
      renderedLines.push(renderLine(nextNewLine, ' ', line.slice(1)));
      nextNewLine++;
    }
  }

  flush();
  return files;
}
