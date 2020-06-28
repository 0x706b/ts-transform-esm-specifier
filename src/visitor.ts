import * as O from "fp-ts/lib/Option";
import * as ts from "typescript";
import { PluginConfig } from "./types";
import { createValidModuleSpecifier } from "./ast-helpers";
import { doesMatchConditions } from "./predicates";
import { getFormattedSpecifier } from "./helpers";
import { pipe } from "fp-ts/lib/pipeable";

export const importExportVisitor: (ctx: ts.TransformationContext, sourceFile: ts.SourceFile, config: PluginConfig) => ts.SourceFile =
   (ctx, sourceFile, config) => {
      const visitor: (node: ts.Node) => ts.Node | undefined =
         node => pipe(
            node,
            doesMatchConditions,
            O.map(getFormattedSpecifier(sourceFile)),
            O.map(createValidModuleSpecifier(O.fromNullable(config.extension))),
            O.fold(
               () => ts.visitEachChild(node, visitor, ctx),
               specifier => ts.isImportDeclaration(node)
                  ? ts.updateImportDeclaration(
                     node,
                     node.decorators,
                     node.modifiers,
                     node.importClause,
                     // @ts-ignore
                     specifier
                  )
                  : ts.isExportDeclaration(node)
                     ? ts.updateExportDeclaration(
                        node,
                        node.decorators,
                        node.modifiers,
                        node.exportClause,
                        // @ts-ignore
                        specifier,
                        node.isTypeOnly
                     )
                     : ts.visitEachChild(node, visitor, ctx)
            )
         );
      return ts.visitEachChild(sourceFile, visitor, ctx);
   };
