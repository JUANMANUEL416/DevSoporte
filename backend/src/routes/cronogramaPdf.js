import { fetchCronograma, buildCronogramaPdf, cronogramaPdfFileName } from '../services/cronogramaPdf.js';

export async function cronogramaPdfHandler(req, res, next) {
  try {
    const tipo = String(req.query.tipo || 'programacion').toLowerCase();
    if (!['programacion', 'seguimiento'].includes(tipo)) {
      return res.status(400).json({ error: 'tipo debe ser programacion o seguimiento' });
    }

    const data = await fetchCronograma(req.params.id);
    if (!data) return res.status(404).json({ error: 'Cronograma no encontrado' });
    if (!data.items.length) {
      return res.status(404).json({ error: 'El cronograma no tiene items' });
    }

    const pdf = await buildCronogramaPdf({ encabezado: data.encabezado, items: data.items, tipo });
    const filename = cronogramaPdfFileName(data.encabezado, tipo);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    res.send(pdf);
  } catch (err) {
    next(err);
  }
}
