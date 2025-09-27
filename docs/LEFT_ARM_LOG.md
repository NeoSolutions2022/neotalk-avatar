# Registro de ajustes na animação do braço esquerdo

## Passo 1 – Leitura do estado atual
- Revisei `teste/index.html` para entender como a linha azul de debug é gerada a partir dos pontos `leftShoulder`, `leftElbow` e `leftWrist` do `pose_frames.json`.
- Confirmei que o SVG (`boy.svg`) só expõe círculos de articulação (`leftShoulder`, `leftElbow`, `leftWrist`) e não possui segmentos separados de braço utilizáveis pelo script.

## Passo 2 – Estratégia
- Mantive toda a instrumentação de debug existente (linha azul e retângulos auxiliares) ativa para respeitar o fluxo atual.
- Planejei adicionar um par de segmentos SVG (`<line>`) sobrepostos ao desenho para seguir exatamente os pontos do braço esquerdo, evitando alterações estruturais no arquivo `boy.svg`.

## Passo 3 – Implementação
- Criei elementos `leftArmUpperOverlay` e `leftArmLowerOverlay` dentro de `teste/index.html`, configurados com cores próximas ao uniforme e à pele originais.
- Atualizei o loop de animação para posicionar esses segmentos em cada quadro com base em `leftShoulder → leftElbow` e `leftElbow → leftWrist` já convertidos para o espaço do puppet.
- Garanti que os novos segmentos sejam ocultados automaticamente caso, no futuro, braços dedicados sejam encontrados no SVG original (`puppetArmReady`).

## Passo 4 – Próximos passos
- Caso `boy.svg` seja atualizado com camadas reais para o braço esquerdo, basta garantir que seus IDs apareçam em `upperCandidates`/`lowerCandidates`; os overlays serão ocultados automaticamente.

## Passo 5 – Controles de debug segmentados
- Adicionei botões de alternância em `teste/index.html` para ativar/desativar individualmente as linhas azuis de debug do braço esquerdo, braço direito e do tronco.
- A função `updateVisibility` agora respeita esses controles, permitindo observar cada membro isoladamente sem alterar o restante da instrumentação.
- Acrescentei um segmento de tronco (`body_line`) que segue o alinhamento entre ombros e quadris para ajudar na orientação espacial do avatar durante o ajuste manual.
