# neotalk-avatar

Prova de conceito que carrega um avatar FBX e reproduz um arquivo `.pose` usando Three.js.

Abra a página e use os botões no topo para selecionar outro avatar ou arquivo de poses, além de controlar a animação.

O parser reconhece arquivos `.pose` no formato:

```
# Frame: 0 - Body keypoints
Nose: 422.4 118.3 0.98
...
# Frame: 0 - Left Hand keypoints
Left Wrist: 380.2 250.1 0.96
```

Somente os pontos do corpo utilizados pelos braços são aplicados no esqueleto do avatar nesta PoC.

## Executando com Docker

```bash
docker build -t avatar-poc .
docker run -p 8080:80 avatar-poc
```

Depois abra http://localhost:8080 no navegador.
