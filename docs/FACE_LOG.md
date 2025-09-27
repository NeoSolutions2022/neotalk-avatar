# Registro de reconstrução do debug facial

## Passo 1 – Levantamento dos pontos faciais disponíveis
- Consultei `boy.svg` para identificar os `circle` usados pelo `skeleton_1_` para sobrancelhas, olhos, nariz, boca e contorno da mandíbula.
- Cataloguei grupos de pontos com a mesma sequência desenhada no esqueleto de referência (ex.: `topMid → rightTop0 → … → leftTop0 → topMid`).

## Passo 2 – Estratégia de sobreposição
- Mantive o fluxo atual de carregamento do SVG sem reexibir o grupo `skeleton_1_`, mas reutilizando suas coordenadas para desenhar novas `polyline`.
- Planejei reunir cada conjunto de IDs em uma lista e gerar as linhas dinamicamente, evitando hardcode de coordenadas e permitindo reaproveitar atualizações do SVG.

## Passo 3 – Implementação em `teste/index.html`
- Criei utilitários `faceGuide`, `readPoint` e `setPolylinePoints` para construir `polyline` com o mesmo estilo das linhas azuis existentes.
- Listei nove guias faciais (contorno, sobrancelhas, olhos, ponte e base do nariz, contorno externo e interno da boca) e gerei cada um com espessuras adequadas.
- Adicionei um novo toggle "Rosto" aos controles de debug para ativar/desativar rapidamente as novas linhas sem alterar a arquitetura atual.

## Passo 4 – Próximos passos
- Mapear os pontos faciais do `pose_frames.json` (quando disponíveis) para animar estas mesmas linhas, reutilizando o pipeline de conversão já aplicado ao tronco e braços.
