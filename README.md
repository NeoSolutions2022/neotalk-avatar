# neotalk-avatar

Prova de conceito que carrega um avatar FBX e reproduz um arquivo `.pose` usando Three.js.

Abra a página e use os botões no topo para selecionar outro avatar ou arquivo de poses, além de controlar a animação.

## Executando com Docker

```bash
docker build -t avatar-poc .
docker run -p 8080:80 avatar-poc
```

Depois abra http://localhost:8080 no navegador.
