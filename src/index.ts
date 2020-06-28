import * as ts from "typescript";
import { PluginConfig } from "./types";
import { importExportVisitor } from "./visitor";

function transform(_: ts.Program, config: PluginConfig): ts.TransformerFactory<ts.SourceFile> {
   return (ctx: ts.TransformationContext) =>
      (sourceFile: ts.SourceFile): ts.SourceFile =>
         importExportVisitor(ctx, sourceFile, config);
}
export default transform;
