import * as pdfjs from 'pdfjs-dist/build/pdf.mjs';
import PdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';

if (pdfjs?.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerPort) {
  pdfjs.GlobalWorkerOptions.workerPort = new PdfjsWorker();
}

export default pdfjs;
