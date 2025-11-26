# Diagramas exportados

Este directorio contiene los diagramas exportados del proyecto.

Para regenerar las imágenes desde el archivo Mermaid `flow.mmd`, instala la CLI de Mermaid y ejecuta:

```bash
# instalar mermaid-cli (como dev dependency)
npm install --save-dev @mermaid-js/mermaid-cli

# exportar a PNG
npx mmdc -i docs/flow.mmd -o docs/flow.png

# exportar a SVG
npx mmdc -i docs/flow.mmd -o docs/flow.svg
```

Si estás en WSL, asegúrate de tener las dependencias del sistema necesarias para Puppeteer/Chromium (ya las instalamos antes: `libnss3`, `libgbm1`, `libgtk-3-0`, etc.).
