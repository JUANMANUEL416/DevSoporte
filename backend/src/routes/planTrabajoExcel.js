import {
  buildPlanTrabajoExcel,
  planTrabajoExcelFileName,
  importPlanTrabajoExcel,
} from '../services/planTrabajoExcel.js';

export async function planTrabajoExcelDownloadHandler(req, res, next) {
  try {
    const { buffer, encabezado } = await buildPlanTrabajoExcel(req.params.id);
    const filename = planTrabajoExcelFileName(encabezado);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function planTrabajoExcelImportHandler(req, res, next) {
  try {
    if (!req.file?.buffer?.length) {
      return res.status(400).json({ error: 'Adjunte el archivo Excel (.xlsx)' });
    }
    const result = await importPlanTrabajoExcel(req.params.id, req.file.buffer);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}
