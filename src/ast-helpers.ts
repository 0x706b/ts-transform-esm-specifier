import * as O from "fp-ts/lib/Option";
import * as ts from "typescript";
import { pipe } from "fp-ts/lib/pipeable";

export const createValidModuleSpecifier: (extension: O.Option<string>) => (formattedSpecifier: string) => ts.PrimaryExpression =
   extension => formattedSpecifier => pipe(
      extension,
      O.fold(
         () => `${formattedSpecifier}.js`,
         ext => `${formattedSpecifier}.${ext}`
      ),
      ts.createLiteral
   );
