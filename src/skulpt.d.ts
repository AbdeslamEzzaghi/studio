
// This file provides basic TypeScript declarations for the global Skulpt object.
// It helps avoid TypeScript errors when using Skulpt, which is loaded via CDN.

declare global {
  var Sk: {
    configure: (options: any) => void;
    misceval: {
      asyncToPromise: (func: () => any, callStops?: any) => Promise<any>;
    };
    importMainWithBody: (name: string,SuspMon?: boolean, code?: string, canSuspend?: boolean) => any;
    builtinFiles?: {
      files: { [key: string]: string };
    };
    ffi: {
      remapToJs: (pyObj: any) => any;
      remapToPy: (jsObj: any) => any;
    };
    // Add other Skulpt properties and methods as needed for more specific typing.
    // For example:
    // TurtleGraphics?: any;
    // externalLibraries?: any;
    // onAfterImport?: (library: string) => void;
    // etc.
  };
}

// This export statement is necessary to make this file a module.
export {};
