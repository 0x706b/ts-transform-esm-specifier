import * as O from "fp-ts/lib/Option";
import * as ts from "typescript";
import fs from "fs";
import path from "path";
import { ImportOrExport, WithModuleSpecifier } from "./types";
// @ts-ignore my hack
import { Module, _resolveFilename } from "module";
import { isModuleSpecifierNotRelative } from "./predicates";
import { pipe } from "fp-ts/lib/pipeable";

export const resolveFilename: (node: WithModuleSpecifier<ImportOrExport>) => O.Option<string> =
   node => O.tryCatch(
      () => _resolveFilename(
         node.moduleSpecifier.text,
         new Module("", undefined),
         false, {
            paths: [""]
         }) as string
   );

export const getResolvedSpecifier: (node: WithModuleSpecifier<ImportOrExport>) => string =
   node => pipe(
      node,
      O.fromPredicate(isModuleSpecifierNotRelative),
      O.chain(resolveFilename),
      O.fold(
         () => node.moduleSpecifier.text,
         s => s
      )
   );

export const removeFileExtFromPath: (ignoredExts: O.Option<string[]>) => (p: path.ParsedPath) => string =
   ignoredExts => p => pipe(
      ignoredExts,
      O.fold(
         () => path.join(p.dir, p.name),
         ignored => ignored.includes(p.ext)
            ? path.join(p.dir, p.base)
            : path.join(p.dir, p.name)
      )
   );

export const sliceResolvedSpecifier: (specifier: string) => (resolvedSpecifier: string) => string = s => rs => rs.slice(rs.lastIndexOf(s));

export const parsePath: (path: string) => path.ParsedPath = p => path.parse(p);

export const getFormattedSpecifier: (sourceFile: ts.SourceFile) => (node: WithModuleSpecifier<ImportOrExport>) => string =
   sourceFile => node => {
      const specifierAbsolutePath =
         node.moduleSpecifier.text === ".."
            ? "../"
            : isModuleSpecifierNotRelative(node)
               ? path.resolve(process.cwd(), "node_modules", node.moduleSpecifier.text)
               : path.resolve(path.parse(sourceFile.fileName).dir, node.moduleSpecifier.text);
      console.log(node.moduleSpecifier.text);
      return pipe(
         O.tryCatch(
            () => fs.lstatSync(specifierAbsolutePath).isDirectory()
         ),
         O.fold(
            () => node.moduleSpecifier.text,
            a => a ? `${node.moduleSpecifier.text}/index` : node.moduleSpecifier.text
         )
      );
   };

const jsonParseSafe: (jsonString: string) => O.Option<Record<string, any>> = s => O.tryCatch(() => JSON.parse(s));

export const findPackageJson = (filePath: string): O.Option<string> => {
   const _s = filePath.split("/");
   return _s[_s.length - 1] === "node_modules"
      ? O.none
      : (() => {
         _s.fill("package.json", _s.length - 1);
         const jsonString = O.tryCatch(() =>
            fs.readFileSync(_s.join("/")).toString()
         );
         _s.pop();
         return O.isSome(jsonString)
            ? jsonString
            : findPackageJson(_s.join("/"));
      })();
};

export const getPackageJsonForNode = (
   node: WithModuleSpecifier<ImportOrExport>
): O.Option<Record<string, any>> => {
   const filePath = process.cwd().concat(`/node_modules/${node.moduleSpecifier.text}/package.json`);
   return pipe(
      O.some(filePath),
      O.chain(s => O.tryCatch(() =>
         fs.readFileSync(s).toString()
      )),
      O.fold(
         () => findPackageJson(filePath.split("/").slice(0, -1).join("/")),
         O.some
      ),
      O.chain(jsonParseSafe)
   );
};

export const deepHasKey: (obj: Record<string, unknown>, key: string) => boolean =
   (obj, key) => {
      let hasKey = false;
      for(const k in obj) {
         if(obj[k] === key) {
            hasKey = true;
         } else if(typeof obj[k] == "object") {
            hasKey = deepHasKey(obj[k] as Record<string, unknown>, key);
         }
         if(hasKey) {
            break;
         }
      }
      return hasKey;
   };
