
// This file provides basic TypeScript declarations for the global Skulpt object.
// It helps avoid TypeScript errors when using Skulpt, which is loaded via CDN.

// Basic Skulpt type definition
interface SkulptStatic {
  configure: (options: any) => void;
  misceval: {
    asyncToPromise: (func: () => any, callStops?: any) => Promise<any>;
  };
  importMainWithBody: (name: string, SuspMon?: boolean, code?: string, canSuspend?: boolean) => any;
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
}

declare global {
  interface Window {
    Sk?: SkulptStatic; // Skulpt might not be loaded immediately, so it's optional
  }
}

// This export statement is necessary to make this file a module.
export {};
