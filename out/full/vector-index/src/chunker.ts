import Parser from "tree-sitter";
import TypeScript from "tree-sitter-typescript";
import Python from "tree-sitter-python";
import Go from "tree-sitter-go";
import Rust from "tree-sitter-rust";
import { CodeChunkSchema, type CodeChunk } from "@eyegents/shared-types";

const PARSERS: Record<string, any> = {
  typescript: TypeScript.typescript,
  tsx: TypeScript.tsx,
  python: Python,
  go: Go,
  rust: Rust
};

const NODE_TYPES: Record<string, string[]> = {
  typescript: ["function_declaration", "function_expression", "arrow_function", "method_definition", "class_declaration", "interface_declaration", "type_alias_declaration", "enum_declaration", "variable_declaration"],
  tsx: ["function_declaration", "function_expression", "arrow_function", "method_definition", "class_declaration", "interface_declaration", "type_alias_declaration", "enum_declaration", "variable_declaration"],
  python: ["function_definition", "class_definition", "async_function_definition"],
  go: ["function_declaration", "method_declaration", "type_declaration", "const_declaration", "var_declaration"],
  rust: ["function_item", "struct_item", "enum_item", "impl_item", "trait_item", "mod_item", "const_item", "static_item"]
};

export interface ChunkOptions {
  maxTokens: number;
  overlap: number;
  language: string;
}

export class ASTChunker {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
  }

  chunk(content: string, filePath: string, options: ChunkOptions): CodeChunk[] {
    const language = this.detectLanguage(filePath);
    const parserLang = PARSERS[language];
    if (!parserLang) {
      return this.fallbackChunk(content, filePath, language, options);
    }

    this.parser.setLanguage(parserLang);
    const tree = this.parser.parse(content);
    const chunks: CodeChunk[] = [];
    const nodeTypes = NODE_TYPES[language] || [];

    this.extractNodes(tree.rootNode, content, filePath, language, nodeTypes, chunks, options);

    if (chunks.length === 0) {
      return this.fallbackChunk(content, filePath, language, options);
    }

    return this.addOverlap(chunks, content, options);
  }

  private detectLanguage(filePath: string): string {
    const ext = filePath.split(".").pop()?.toLowerCase();
    const map: Record<string, string> = {
      ts: "typescript",
      tsx: "tsx",
      js: "typescript",
      jsx: "tsx",
      py: "python",
      go: "go",
      rs: "rust"
    };
    return map[ext || ""] || "typescript";
  }

  private extractNodes(
    node: any,
    content: string,
    filePath: string,
    language: string,
    nodeTypes: string[],
    chunks: CodeChunk[],
    options: ChunkOptions
  ): void {
    if (nodeTypes.includes(node.type)) {
      const nodeText = content.slice(node.startIndex, node.endIndex);
      const tokens = this.estimateTokens(nodeText);
      if (tokens <= options.maxTokens * 1.5) {
        chunks.push(this.createChunk(node, content, filePath, language, nodeText));
      } else {
        this.splitLargeNode(node, content, filePath, language, chunks, options);
      }
    }

    for (const child of node.children) {
      this.extractNodes(child, content, filePath, language, nodeTypes, chunks, options);
    }
  }

  private splitLargeNode(
    node: any,
    content: string,
    filePath: string,
    language: string,
    chunks: CodeChunk[],
    options: ChunkOptions
  ): void {
    const lines = content.slice(node.startIndex, node.endIndex).split("\n");
    let currentChunk = "";
    let startLine = node.startPosition.row + 1;

    for (let i = 0; i < lines.length; i++) {
      currentChunk += lines[i] + "\n";
      if (this.estimateTokens(currentChunk) >= options.maxTokens) {
        const endLine = startLine + i;
        chunks.push({
          id: `${filePath}:${startLine}-${endLine}`,
          filePath,
          language,
          astType: node.type,
          content: currentChunk.trim(),
          startLine,
          endLine,
          createdAt: new Date().toISOString()
        });
        currentChunk = "";
        startLine = endLine + 1;
      }
    }

    if (currentChunk.trim()) {
      chunks.push({
        id: `${filePath}:${startLine}-${node.endPosition.row + 1}`,
        filePath,
        language,
        astType: node.type,
        content: currentChunk.trim(),
        startLine,
        endLine: node.endPosition.row + 1,
        createdAt: new Date().toISOString()
      });
    }
  }

  private createChunk(
    node: any,
    content: string,
    filePath: string,
    language: string,
    nodeText: string
  ): CodeChunk {
    return {
      id: `${filePath}:${node.startPosition.row + 1}-${node.endPosition.row + 1}`,
      filePath,
      language,
      astType: node.type,
      content: nodeText,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      createdAt: new Date().toISOString()
    };
  }

  private fallbackChunk(content: string, filePath: string, language: string, options: ChunkOptions): CodeChunk[] {
    const lines = content.split("\n");
    const chunks: CodeChunk[] = [];
    let currentChunk = "";
    let startLine = 1;

    for (let i = 0; i < lines.length; i++) {
      currentChunk += lines[i] + "\n";
      if (this.estimateTokens(currentChunk) >= options.maxTokens) {
        chunks.push({
          id: `${filePath}:${startLine}-${startLine + i}`,
          filePath,
          language,
          astType: "fallback_chunk",
          content: currentChunk.trim(),
          startLine,
          endLine: startLine + i,
          createdAt: new Date().toISOString()
        });
        currentChunk = "";
        startLine = startLine + i + 1 - Math.floor(options.overlap / 10);
      }
    }

    if (currentChunk.trim()) {
      chunks.push({
        id: `${filePath}:${startLine}-${lines.length}`,
        filePath,
        language,
        astType: "fallback_chunk",
        content: currentChunk.trim(),
        startLine,
        endLine: lines.length,
        createdAt: new Date().toISOString()
      });
    }

    return chunks;
  }

  private addOverlap(chunks: CodeChunk[], content: string, options: ChunkOptions): CodeChunk[] {
    if (options.overlap <= 0 || chunks.length <= 1) return chunks;

    return chunks.map((chunk, i) => {
      if (i === 0) return chunk;
      const prevChunk = chunks[i - 1];
      const overlapLines = Math.min(options.overlap, prevChunk.content.split("\n").length);
      const overlapContent = prevChunk.content.split("\n").slice(-overlapLines).join("\n");
      return {
        ...chunk,
        content: overlapContent + "\n" + chunk.content
      };
    });
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 3.5);
  }
}

export const chunker = new ASTChunker();