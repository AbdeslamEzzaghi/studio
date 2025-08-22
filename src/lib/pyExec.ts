"use client";
// Client-side Python execution using Skulpt
// Loads Skulpt from CDN on-demand and executes code with provided test input lines

export type ExecuteResult = {
	successOutput: string | null;
	errorOutput: string | null;
};

// Minimal loader that ensures Skulpt core and stdlib are available
async function ensureSkulptLoaded(): Promise<void> {
	if (typeof (globalThis as any).Sk !== 'undefined' && (globalThis as any).Sk?.builtinFiles) {
		return;
	}

	function loadScript(src: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const s = document.createElement('script');
			s.src = src;
			s.async = true;
			s.onload = () => resolve();
			s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
			document.head.appendChild(s);
		});
	}

	// Use reliable CDN versions
	const coreUrl = 'https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt.min.js';
	const stdlibUrl = 'https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt-stdlib.js';

	// Load core first, then stdlib
	if (typeof (globalThis as any).Sk === 'undefined') {
		await loadScript(coreUrl);
	}
	if (!(globalThis as any).Sk?.builtinFiles) {
		await loadScript(stdlibUrl);
	}
}

export async function runPythonLocally(params: { code: string; testInput?: string }): Promise<ExecuteResult> {
	await ensureSkulptLoaded();

	const Sk: any = (globalThis as any).Sk;
	const outputChunks: string[] = [];
	const inputLines: string[] = (params.testInput ?? '').split('\n');
	let inputIndex = 0;

	function out(text: string) {
		outputChunks.push(text);
	}

	function builtinRead(x: string) {
		if (!Sk.builtinFiles || !Sk.builtinFiles['files'][x]) {
			throw new Error(`Skulpt: File not found: ${x}`);
		}
		return Sk.builtinFiles['files'][x];
	}

	function inputfun(): string {
		const value = inputLines[inputIndex] ?? '';
		inputIndex += 1;
		return value;
	}

	Sk.configure({
		output: out,
		read: builtinRead,
		inputfun,
		inputfunTakesPrompt: false,
		__future__: Sk.python3,
	});

	try {
		await Sk.misceval.asyncToPromise(() =>
			Sk.importMainWithBody('<stdin>', false, params.code, true)
		);
		// Skulpt prints without ensuring trailing newline consistency; join as-is
		return { successOutput: outputChunks.join(''), errorOutput: null };
	} catch (err: any) {
		// Skulpt errors often have toString with traceback
		const message = typeof err === 'object' && err !== null && 'toString' in err ? String(err) : (err?.message ?? 'Unknown error');
		return { successOutput: null, errorOutput: message };
	}
}


