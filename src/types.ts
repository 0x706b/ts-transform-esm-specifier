import * as ts from "typescript";

export type ImportOrExport = ts.ImportDeclaration | ts.ExportDeclaration;

export type WithModuleSpecifier<T extends ImportOrExport> = T & {
   moduleSpecifier: ts.StringLiteral;
}

export type PluginConfig = {
   extension?: string;
   ignore?: string[];
};
