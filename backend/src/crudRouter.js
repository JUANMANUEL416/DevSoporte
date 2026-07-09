import { Router } from 'express';
import { query } from './db/pool.js';
import { generarConsecutivo } from './services/consecutivo.js';

function colRef(entity, column) {
  if (entity.tableAlias && !column.includes('.')) {
    return `${entity.tableAlias}.${column}`;
  }
  return column;
}

function listFromClause(entity) {
  return entity.listFrom || entity.table;
}

function listOrderBy(entity) {
  const order = entity.orderBy || entity.pk[0];
  if (entity.tableAlias && !order.includes('.')) {
    return order
      .split(',')
      .map((part) => {
        const trimmed = part.trim();
        const [field, dir] = trimmed.split(/\s+/);
        return `${colRef(entity, field)}${dir ? ` ${dir}` : ''}`;
      })
      .join(', ');
  }
  return order;
}

// Construye un router REST estándar para una entidad descrita en entities.js.
export function crudRouter(entity) {
  const router = Router();
  const { table, pk, columns, search = [], orderBy, filterColumns = [] } = entity;
  const listSearch = entity.listSearch || search;

  const pkWhere = (offset = 0) =>
    pk.map((c, i) => `${c} = $${offset + i + 1}`).join(' AND ');

  const splitId = (id) => String(id).split('~');

  function sanitizeRow(row) {
    if (!row || !entity.responseOmit?.length) return row;
    const out = { ...row };
    for (const key of entity.responseOmit) delete out[key];
    return out;
  }

  const buildWhere = (req) => {
    const params = [];
    const clauses = [];

    const q = (req.query.q || '').trim();
    if (q && listSearch.length) {
      params.push(`%${q}%`);
      clauses.push(
        '(' + listSearch.map((c) => `CAST(${c} AS TEXT) ILIKE $1`).join(' OR ') + ')',
      );
    }

    const ciFilters = entity.filterColumnsCaseInsensitive || [];
    for (const col of filterColumns) {
      const val = req.query[col];
      if (val !== undefined && val !== '' && val !== 'Todos') {
        params.push(val);
        const ref = colRef(entity, col);
        if (ciFilters.includes(col)) {
          clauses.push(`LOWER(${ref}) = LOWER($${params.length})`);
        } else {
          clauses.push(`${ref} = $${params.length}`);
        }
      }
    }

    const dateFilters = entity.listDateFilters || {};
    for (const [param, cfg] of Object.entries(dateFilters)) {
      const val = (req.query[param] || '').trim();
      if (!val) continue;

      if (cfg.op === 'like_suffix') {
        params.push(`%${val}`);
        clauses.push(`${cfg.column} LIKE $${params.length}`);
        continue;
      }

      params.push(val);
      if (cfg.op === '<=' && cfg.addDays) {
        clauses.push(`${cfg.column} < ($${params.length}::date + ${cfg.addDays})`);
      } else if (cfg.op === '>=') {
        clauses.push(`$${params.length}::date >= ${cfg.column}::date`);
      } else if (cfg.op === 'column_gte') {
        clauses.push(`${cfg.column} >= $${params.length}::date`);
      } else if (cfg.op === 'column_lte') {
        clauses.push(`${cfg.column} <= $${params.length}::date`);
      } else {
        clauses.push(`${cfg.column} ${cfg.op} $${params.length}`);
      }
    }

    const excludeCap = entity.excludeCapacitaParam && req.query[entity.excludeCapacitaParam];
    if (excludeCap && entity.excludeCapacitaSoport) {
      params.push(excludeCap);
      clauses.push(`(
        codigo NOT IN (
          SELECT SUBSTRING(documento FROM 5) FROM rasistd
          WHERE cnscapacita = $${params.length} AND documento LIKE 'SOP#%'
        )
        AND (
          documento IS NULL OR TRIM(documento) = ''
          OR documento NOT IN (
            SELECT documento FROM rasistd
            WHERE cnscapacita = $${params.length}
              AND documento IS NOT NULL AND TRIM(documento) <> ''
          )
        )
      )`);
    } else if (excludeCap && entity.excludeCapacitaDocumentPrefix) {
      params.push(excludeCap, entity.excludeCapacitaDocumentPrefix);
      clauses.push(
        `codigo NOT IN (
          SELECT SUBSTRING(documento FROM ${entity.excludeCapacitaDocumentPrefix.length + 1})
          FROM rasistd
          WHERE cnscapacita = $${params.length - 1}
            AND documento LIKE $${params.length} || '%'
        )`,
      );
    } else if (excludeCap) {
      params.push(excludeCap);
      clauses.push(
        `documento NOT IN (SELECT documento FROM rasistd WHERE cnscapacita = $${params.length} AND documento IS NOT NULL AND TRIM(documento) <> '')`,
      );
    }

    const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
    return { where, params };
  };

  // LISTADO
  router.get('/', async (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 25));

      const { where, params } = buildWhere(req);
      const from = listFromClause(entity);
      const selectCols = entity.listSelect || '*';

      const totalRes = await query(`SELECT COUNT(*)::int AS total FROM ${from} ${where}`, params);
      const total = totalRes.rows[0].total;

      params.push(limit, (page - 1) * limit);
      const rows = await query(
        `SELECT ${selectCols} FROM ${from} ${where} ORDER BY ${listOrderBy(entity)} LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      );

      res.json({ data: rows.rows, total, page, limit });
    } catch (err) {
      next(err);
    }
  });

  // DETALLE
  router.get('/:id', async (req, res, next) => {
    try {
      const ids = splitId(req.params.id);
      const result = await query(`SELECT * FROM ${table} WHERE ${pkWhere()}`, ids);
      if (!result.rows.length) return res.status(404).json({ error: 'No encontrado' });
      res.json(sanitizeRow(result.rows[0]));
    } catch (err) {
      next(err);
    }
  });

  // CREAR
  router.post('/', async (req, res, next) => {
    try {
      const body = { ...req.body };

      if (entity.autoConsecutivo) {
        const { field } = entity.autoConsecutivo;
        const val = body[field];
        if (val === undefined || val === null || String(val).trim() === '') {
          body[field] = await generarConsecutivo(entity.autoConsecutivo);
        }
      }

      if (entity.validateCreate) {
        await entity.validateCreate(body);
      }

      if (entity.beforeCreate) {
        await entity.beforeCreate(body);
      }

      const cols = columns.filter((c) => body[c] !== undefined && body[c] !== null && body[c] !== '');
      if (!cols.length) return res.status(400).json({ error: 'Sin datos para crear' });
      const values = cols.map((c) => body[c]);
      const placeholders = cols.map((_, i) => `$${i + 1}`);
      const result = await query(
        `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
        values,
      );
      const row = result.rows[0];
      let _meta;
      if (entity.afterCreate) {
        try {
          _meta = await entity.afterCreate(row);
        } catch (err) {
          console.error(`[${table}] afterCreate:`, err.message);
        }
      }
      const safeRow = sanitizeRow(row);
      res.status(201).json(_meta ? { ...safeRow, _meta } : safeRow);
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message });
      next(err);
    }
  });

  // ACTUALIZAR
  router.put('/:id', async (req, res, next) => {
    try {
      const ids = splitId(req.params.id);
      if (entity.beforeUpdate) {
        await entity.beforeUpdate(req.body, ids);
      }
      const cols = columns.filter((c) => !pk.includes(c) && req.body[c] !== undefined);
      if (!cols.length) return res.status(400).json({ error: 'Sin datos para actualizar' });
      const values = cols.map((c) => req.body[c]);
      const setClause = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
      const result = await query(
        `UPDATE ${table} SET ${setClause} WHERE ${pkWhere(cols.length)} RETURNING *`,
        [...values, ...ids],
      );
      if (!result.rows.length) return res.status(404).json({ error: 'No encontrado' });
      res.json(sanitizeRow(result.rows[0]));
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message });
      next(err);
    }
  });

  // ELIMINAR
  router.delete('/:id', async (req, res, next) => {
    try {
      const ids = splitId(req.params.id);
      if (entity.beforeDelete) {
        await entity.beforeDelete(ids);
      }
      const result = await query(`DELETE FROM ${table} WHERE ${pkWhere()} RETURNING *`, ids);
      if (!result.rows.length) return res.status(404).json({ error: 'No encontrado' });
      res.json({ ok: true });
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message });
      next(err);
    }
  });

  return router;
}
