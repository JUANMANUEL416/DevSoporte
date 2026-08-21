/** Orden natural por segmentos numéricos (24.1.2 antes de 24.1.10). */
export function compareCodigoNum(a, b) {
  const pa = String(a || '').split('.').map((n) => Number(n) || 0);
  const pb = String(b || '').split('.').map((n) => Number(n) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}

export function isGrouperTipo(tipo) {
  return /titulo/i.test(String(tipo || ''));
}

function findParentCode(code, byCode) {
  const parts = String(code || '').split('.');
  for (let len = parts.length - 1; len >= 1; len -= 1) {
    const candidate = parts.slice(0, len).join('.');
    if (byCode.has(candidate)) return candidate;
  }
  return null;
}

/**
 * Arma árbol de procesos según codigo_num y tipos Titulo / Submódulo/Titulo.
 */
export function buildProcessTree(rows = []) {
  const sorted = [...rows].sort((a, b) => compareCodigoNum(a.codigo_num, b.codigo_num));
  const byCode = new Map();

  for (const row of sorted) {
    const code = row.codigo_num || row.codigo;
    byCode.set(code, {
      process: row,
      codigo_num: code,
      isGrouper: isGrouperTipo(row.tipo),
      children: [],
    });
  }

  const roots = [];
  for (const row of sorted) {
    const code = row.codigo_num || row.codigo;
    const node = byCode.get(code);
    const parentCode = findParentCode(code, byCode);
    if (parentCode) {
      byCode.get(parentCode).children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export function isSelectableProcess(row) {
  return Boolean(row?.codigo) && !isGrouperTipo(row.tipo);
}

/** Códigos de procesos seleccionables (hojas, sin títulos agrupadores). */
export function collectSelectableCodes(node) {
  const codes = [];
  function walk(n) {
    for (const child of n.children || []) walk(child);
    if (n.process && isSelectableProcess(n.process)) {
      codes.push(n.process.codigo);
    }
  }
  walk(node);
  return codes;
}

export function collectSelectableFromTree(nodes = []) {
  const all = new Set();
  for (const node of nodes) {
    for (const code of collectSelectableCodes(node)) all.add(code);
  }
  return [...all];
}

/** Filtra árbol por texto (nombre, codigo_num, tipo). */
export function filterProcessTree(nodes, queryText) {
  const q = String(queryText || '').trim().toLowerCase();
  if (!q) return nodes;

  function matches(node) {
    const p = node.process || {};
    return [p.nombre, p.codigo_num, p.tipo, p.descripcion]
      .some((v) => String(v || '').toLowerCase().includes(q));
  }

  function filterNode(node) {
    const children = (node.children || []).map(filterNode).filter(Boolean);
    if (matches(node) || children.length) {
      return { ...node, children };
    }
    return null;
  }

  return nodes.map(filterNode).filter(Boolean);
}

export function nodeSelectionState(node, selectedSet) {
  const codes = collectSelectableCodes(node);
  if (!codes.length) return { checked: false, indeterminate: false, codes: [] };
  const picked = codes.filter((c) => selectedSet.has(c));
  return {
    codes,
    checked: picked.length === codes.length,
    indeterminate: picked.length > 0 && picked.length < codes.length,
  };
}
