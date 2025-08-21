// Simple, deterministic analyzer for common Python error messages
// Produces student-friendly explanations without using AI.

export type Analysis = {
  explanation: string;
  confident: boolean;
};

function extractLineNumber(errorText: string): number | null {
  const m = errorText.match(/line\s+(\d+)/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

function balanceScore(text: string): { paren: number; bracket: number; brace: number } {
  let paren = 0, bracket = 0, brace = 0;
  for (const ch of text) {
    if (ch === '(') paren++;
    else if (ch === ')') paren--;
    else if (ch === '[') bracket++;
    else if (ch === ']') bracket--;
    else if (ch === '{') brace++;
    else if (ch === '}') brace--;
  }
  return { paren, bracket, brace };
}

export function analyzePythonError(errorText: string, code: string): Analysis {
  const lines = code.split('\n');
  const lineNum = extractLineNumber(errorText);
  const errorLower = errorText.toLowerCase();

  // ValueError conversion
  if (errorLower.includes('valueerror: could not convert string to float')) {
    return {
      confident: true,
      explanation:
        "Tu essaies de convertir un texte en nombre (float). Assure-toi que l'entrée contient uniquement des chiffres (ex: '12.5'). Tu peux vérifier l'entrée avant de la convertir ou utiliser try/except pour afficher un message clair à l'élève.",
    };
  }

  // ZeroDivision
  if (errorLower.includes('zerodivisionerror')) {
    return {
      confident: true,
      explanation:
        "Tu effectues une division par zéro. Vérifie la valeur du dénominateur avant la division et gère le cas où il vaut 0 (par exemple afficher un message).",
    };
  }

  // NameError: name 'x' is not defined
  if (errorLower.includes('nameerror') && /name\s+'[^']+'\s+is\s+not\s+defined/i.test(errorText)) {
    const m = errorText.match(/name\s+'([^']+)'\s+is\s+not\s+defined/i);
    const name = m?.[1] ?? 'cette variable';
    return {
      confident: true,
      explanation: `La variable '${name}' est utilisée avant d'être définie. Déclare ou initialise '${name}' avant son utilisation, ou vérifie l'orthographe du nom.`,
    };
  }

  // TypeError unsupported operand types
  if (errorLower.includes('typeerror') && errorLower.includes('unsupported operand type')) {
    return {
      confident: true,
      explanation:
        "Tu essaies d'opérer sur des types incompatibles (par ex. addition d'un texte et d'un nombre). Convertis les valeurs au bon type (int/float) avant l'opération.",
    };
  }

  // SyntaxError patterns
  if (errorLower.includes('syntaxerror')) {
    const ln = lineNum ?? undefined;
    const curr = ln ? lines[ln - 1] ?? '' : '';
    const prev = ln && ln > 1 ? lines[ln - 2] ?? '' : '';

    // Missing colon at the end of a block header (if/elif/else/for/while/def/class/try/except/finally)
    const currTrim = curr.trim();
    const headerTokenMatch = currTrim.match(/^(if|elif|else|for|while|def|class|try|except|finally)\b/i);
    if (headerTokenMatch) {
      const endsWithColon = /:\s*$/.test(currTrim);
      if (!endsWithColon) {
        const token = headerTokenMatch[1].toLowerCase();
        return {
          confident: true,
          explanation: `Il manque ':' à la fin de la ligne ${ln} après '${token}'. En Python, les blocs (if/elif/else/for/while/def/class/try/except/finally) doivent se terminer par ':'`,
        };
      }
    }

    // Indentation heuristics
    const leading = (s: string) => s.replace(/\t/g, '    ').match(/^\s*/)?.[0].length ?? 0;
    const prevTrim = prev.trimEnd();
    const prevEndsWithColon = /:\s*$/.test(prevTrim);
    const currIndent = leading(curr);
    const prevIndent = leading(prev);

    // If previous line does not start a block but current is more indented => unexpected indent
    if (!prevEndsWithColon && currIndent > prevIndent && curr.trim().length > 0) {
      return {
        confident: true,
        explanation:
          `Indentation inattendue à la ligne ${ln}. Tu as ajouté plus d'espaces que la ligne précédente sans ouvrir de nouveau bloc (pas de ':' avant). Aligne cette ligne avec la précédente ou ouvre un bloc auparavant.`,
      };
    }

    // If previous line starts a block but current is not indented enough => expected an indented block
    if (prevEndsWithColon && curr.trim().length > 0 && currIndent <= prevIndent) {
      return {
        confident: true,
        explanation:
          `Après la ligne ${ln ? ln - 1 : ''} qui se termine par ':', la ligne ${ln} doit être indentée (par ex. 4 espaces). Ajoute une indentation cohérente sous le 'if/for/while/def'.`,
      };
    }

    // Mixed tabs/spaces
    if ((prev.includes('\t') || curr.includes('\t')) && (/^\s+/.test(prev) || /^\s+/.test(curr))) {
      return {
        confident: true,
        explanation:
          `Indentation incohérente (mélange tabulations/espaces). Utilise uniquement des espaces (ex: 4 espaces) pour toutes les indentations, surtout autour de la ligne ${ln}.`,
      };
    }

    // Heuristic: if previous line has more opening than closing parens/brackets/braces
    const balanceA = balanceScore(prev);
    if (balanceA.paren > 0) {
      return {
        confident: true,
        explanation:
          `Il manque probablement une parenthèse fermante ')' à la fin de la ligne ${ln ? ln - 1 : ''}. Ajoute ')' à la fin de l'appel (par ex. input(...) ou float(...)).`,
      };
    }
    if (balanceA.bracket > 0) {
      return {
        confident: true,
        explanation: `Il manque probablement ']' à la fin de la ligne ${ln ? ln - 1 : ''}.`,
      };
    }
    if (balanceA.brace > 0) {
      return {
        confident: true,
        explanation: `Il manque probablement '}' à la fin de la ligne ${ln ? ln - 1 : ''}.`,
      };
    }

    // Parenthesis imbalance on previous line
    const balanceB = balanceScore(prev);
    if (balanceB.paren > 0) {
      return {
        confident: true,
        explanation:
          `Il manque probablement une parenthèse fermante ')' à la fin de la ligne ${ln ? ln - 1 : ''}.`,
      };
    }

    // Generic syntax message
    if (ln) {
      return {
        confident: false,
        explanation: `Erreur de syntaxe à la ligne ${ln}. Vérifie les parenthèses, les deux-points et la fin de ligne. Ligne en cause: ${curr.trim()}`,
      };
    }
  }

  return {
    confident: false,
    explanation: "Une erreur s'est produite. Relis la ligne indiquée dans le message d'erreur et vérifie parenthèses, types et noms de variables.",
  };
}


