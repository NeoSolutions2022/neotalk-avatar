# neotalk-avatar

Prova de conceito que carrega um avatar FBX e reproduz um arquivo `.pose` usando Three.js.

Abra a página e use os botões no topo para selecionar outro avatar ou arquivo de poses, além de controlar a animação.

Use o campo **Escala** para multiplicar o deslocamento dos keypoints
durante os testes (o valor pode ser alterado enquanto a animação roda).

O parser reconhece arquivos `.pose` no formato:

```
# Frame: 0 - Body keypoints
Nose: 422.4 118.3 0.98
...
# Frame: 0 - Left Hand keypoints
Left Wrist: 380.2 250.1 0.96
```

Somente os pontos do corpo utilizados pelos braços são aplicados no esqueleto do avatar nesta PoC. Cada frame começa da pose de descanso, evitando acúmulo de rotações.

Também é suportado o formato legado onde cada linha do arquivo é um dicionário Python com os grupos `body`, `left_hand`, `right_hand` e `face`. A normalização das coordenadas é feita automaticamente de acordo com a maior largura/altura encontradas.

Durante a reprodução, os quaternions calculados para cada osso são registrados no console do navegador (`rotBone ...`), facilitando o debug caso o avatar permaneça imóvel.

## Executando com Docker

```bash
docker build -t avatar-poc .
docker run -p 8080:80 avatar-poc
```

Depois abra http://localhost:8080 no navegador.
