'use client';

import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { java } from '@codemirror/lang-java';
import { oneDark } from '@codemirror/theme-one-dark';

interface CodeMirrorWrapperProps {
  value: string;
  onChange: (val: string) => void;
  height?: string;
  readOnly?: boolean;
}

export default function CodeMirrorWrapper({
  value,
  onChange,
  height = '500px',
  readOnly = false,
}: CodeMirrorWrapperProps) {
  return (
    <CodeMirror
      value={value}
      height={height}
      theme={oneDark}
      extensions={[java()]}
      onChange={onChange}
      readOnly={readOnly}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLineGutter: true,
        highlightSpecialChars: true,
        history: true,
        foldGutter: true,
        drawSelection: true,
        dropCursor: true,
        allowMultipleSelections: true,
        indentOnInput: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: true,
        rectangularSelection: true,
        crosshairCursor: true,
        highlightActiveLine: true,
        highlightSelectionMatches: true,
        closeBracketsKeymap: true,
        defaultKeymap: true,
        searchKeymap: true,
        historyKeymap: true,
        foldKeymap: true,
        completionKeymap: true,
        lintKeymap: true,
      }}
      className="text-xs font-mono rounded-xl overflow-hidden border border-white/6"
    />
  );
}
