import * as O from "fp-ts/lib/Option";
import * as fileExtensions from "./file-extensions.json";
import * as ts from "typescript";
import fs from "fs";
import path from "path";
import { ImportOrExport, WithModuleSpecifier } from "./types";
import {
   deepHasKey,
   getPackageJsonForNode,
   getResolvedSpecifier,
   parsePath,
   resolveFilename,
   sliceResolvedSpecifier
} from "./helpers";
import { pipe } from "fp-ts/lib/pipeable";

export const isImportOrExportDeclaration: (node: ts.Node) => node is ImportOrExport =
   (node): node is ImportOrExport => ts.isImportDeclaration(node) || ts.isExportDeclaration(node);

export const isModuleSpecifierStringLiteral: (node: ImportOrExport) => node is WithModuleSpecifier<ImportOrExport> =
   (node): node is WithModuleSpecifier<ImportOrExport> => !!(node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier));

export const isModuleSpecifierPackage: (node: WithModuleSpecifier<ImportOrExport>) => boolean =
   node => pipe(
      node,
      resolveFilename,
      O.map(p => p.split("/").slice(0, -1).join("/")),
      O.chain(p => O.tryCatch(() => {
         fs.lstatSync(path.resolve(p, "package.json")).isFile();
      })),
      O.fold(
         () => false,
         _ => true
      )
   );

export const isModuleSpecifierNotPackageJson: (node: WithModuleSpecifier<ImportOrExport>) => boolean =
   node => !isModuleSpecifierPackage(node);

export const isModuleSpecifierRelative: (node: WithModuleSpecifier<ImportOrExport>) => boolean =
   node =>
      node.moduleSpecifier.text.startsWith("./") ||
      node.moduleSpecifier.text.startsWith("../") ||
      node.moduleSpecifier.text.startsWith("..");

export const isModuleSpecifierNotRelative: (node: WithModuleSpecifier<ImportOrExport>) => boolean =
   node => !isModuleSpecifierRelative(node);

export const isESModule: (packageJSON: Record<string, any>) => boolean =
   packageJSON => packageJSON.type === "module" || (packageJSON.exports && deepHasKey(packageJSON.exports, "import"));

export const isPackageAndNotImportingMain: (node: WithModuleSpecifier<ImportOrExport>) => boolean =
   node => pipe(
      node,
      O.fromPredicate(isModuleSpecifierNotRelative),
      O.map(getPackageJsonForNode),
      O.fold(
         () => true,
         O.fold(
            () => true,
            json => {
               const resolvedSpecifier = pipe(
                  node,
                  getResolvedSpecifier,
                  sliceResolvedSpecifier(node.moduleSpecifier.text)
               );
               return isESModule(json) && json.exports && deepHasKey(json.exports, ".")
                  ? node.moduleSpecifier.text === json.name
                     ? false
                     : true
                  : json.main && resolvedSpecifier === path.join(json.name, json.main)
                     ? false
                     : true;
            }
         )
      )
   );


export const isModuleSpecifierExtensionUnknown: (node: WithModuleSpecifier<ImportOrExport>) => boolean =
   node => {
      const extension = path.extname(node.moduleSpecifier.text);
      for (const key of Object.keys(fileExtensions)) {
         if (key === " " || key === "") {
            continue;
         }
         if (extension === key || extension === key.toLowerCase()) {
            return false;
         }
      }
      return true;
   };

export const isResolvedEqualToSpecifier: (node: WithModuleSpecifier<ImportOrExport>) => boolean =
   node => pipe(
      node,
      O.fromPredicate(isModuleSpecifierNotRelative),
      O.chain(n => pipe(
         getPackageJsonForNode(n),
         O.fold(
            () => O.some(n),
            json => isESModule(json) ? O.none : O.some(n)
         )
      )),
      O.map(getResolvedSpecifier),
      O.map(sliceResolvedSpecifier(node.moduleSpecifier.text)),
      O.map(parsePath),
      O.fold(
         () => true,
         s => node.moduleSpecifier.text === `${s.dir}/${s.name}` ||
              node.moduleSpecifier.text === `${s.dir}`
      )
   );

export const doesMatchConditions: (node: ts.Node) => O.Option<WithModuleSpecifier<ImportOrExport>> =
   node => pipe(
      node,
      O.fromPredicate(isImportOrExportDeclaration),
      O.chain(O.fromPredicate(isModuleSpecifierStringLiteral)),
      O.chain(O.fromPredicate(isResolvedEqualToSpecifier)),
      O.chain(O.fromPredicate(isModuleSpecifierExtensionUnknown)),
      O.chain(O.fromPredicate(isModuleSpecifierNotPackageJson)),
      O.chain(O.fromPredicate(isPackageAndNotImportingMain))
   );
