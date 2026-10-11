# EJN Benefícios — Landing page

Landing page pública e responsiva, em português, feita com HTML, CSS e JavaScript. Não exige conta no ChatGPT, autenticação ou backend. Os botões de adesão levam à plataforma oficial EJN, que possui seu próprio cadastro.

## Desenvolvimento

Requer Node.js 20 ou superior. Não há dependências para instalar.

```sh
npm run dev
```

Abra `http://localhost:3000`. Para outra porta: `PORT=8080 npm run dev`.

```sh
npm test
npm run build
```

O build recria somente o diretório gerado `dist/` e copia os arquivos públicos. Não inclui os originais de produção em `design-sources/`. Também é possível abrir `index.html` diretamente no navegador, sem servidor.

## Publicação sem login

Publique o conteúdo de `dist/` como site estático público em sua hospedagem. No GitHub Pages, pode-se publicar a raiz da branch `main`: Settings → Pages → Deploy from a branch → main → /(root). A configuração de Pages e a disponibilidade dependem das permissões e do plano do repositório. Nenhuma autenticação ChatGPT é implementada pela página.

Não há publicação automática configurada. A URL pública precisa ser verificada após a ativação da hospedagem. As ferramentas do conector Sites não estavam disponíveis durante a implementação.

## Identidade e conteúdo

- Fontes principais: Inter Tight (títulos) e Inter (texto), conforme a plataforma oficial. Caveat aparece apenas em anotações manuscritas. As três são locais, em WOFF2, com caracteres latinos e portugueses. Licenças SIL OFL em `assets/`.
- Ícones: Bootstrap Icons 1.13.1 (MIT), incorporados como um sprite SVG no HTML. Não usam CDN, fontes de ícones, requisições adicionais ou JavaScript para aparecer. Licença em `assets/Bootstrap-Icons-LICENSE.txt`.
- Cores oficiais: `#0A0F2E`, `#181F4B`, `#7C3AED`, `#9B68F3`, `#F8FAFC`.
- Logo, favicon e imagem principal: plataforma `https://ejnbeneficios.escolajovensdenegocios.com/`.
- Categorias, informações institucionais, contato e logos de parceiros: `https://escolajovensdenegocios.com/beneficios/`.
- A LP não promete percentuais, preços ou ofertas específicas: condições e disponibilidade são consultadas na plataforma.
- WhatsApp segue o destino dos links do site original: `5517982254444`.
- O botão “Instituto EJN” aponta para `https://escolajovensdenegocios.com/`, endereço confirmado pelo cliente, e permanece visível no header do celular.

Edite conteúdo e sprite de ícones em `index.html`, visual em `styles.css` e interações em `app.js`. Todos os recursos visuais e fontes estão no repositório: nenhuma dependência de CDN no carregamento.

## Imagens e fontes

Os arquivos originais foram preservados em `design-sources/`; a página carrega apenas `assets/`.

- Logo: redimensionado de 7680 px para 600 px, WebP de aproximadamente 8 KB.
- Foto principal: WebP de 400, 640 e 960 px, selecionado por `srcset` e `sizes`. Carregamento prioritário apenas na imagem principal.
- Logos dos parceiros: WebP de 240 px com carregamento tardio e dimensões explícitas.
- Fontes principais: de aproximadamente 1,39 MiB em TTF para 163 KiB em WOFF2. Caveat acrescenta aproximadamente 77 KiB.

Conversão de imagens feita com Sharp (WebP, esforço 6, qualidade 83 na foto, 92 no logo e 88 nos parceiros). As fontes foram convertidas com FontTools/Brotli, mantendo Unicode U+0000–017F e U+2000–206F (e U+20AC nas fontes Inter). Os originais permitem novas exportações sem recompressões sucessivas.

## Movimento e acessibilidade

- As seções e os ícones entram ao rolar nos dois sentidos. O conteúdo permanece visível sem JavaScript.
- O cartão inclina ao passar o mouse e acompanha o arraste horizontal, limitado à área disponível. O processamento para quando o cartão está em repouso.
- Teclado: focalize o cartão e use as setas esquerda/direita; Home ou Escape centralizam. Há também botões para mover e centralizar.
- `touch-action: pan-y` mantém a rolagem vertical no celular. Cancelamento de toque e perda de foco encerram o arraste.
- `prefers-reduced-motion` desliga entradas animadas, inclinação por hover e transições, inclusive quando a preferência muda com a página aberta. Os controles de posição continuam funcionando sem animação.

## Verificação

`npm test` verifica acesso HTTP público, recursos locais e fontes, métodos HTTP e bloqueio de arquivos internos no servidor de desenvolvimento.

Testes opcionais de navegador (dependência apenas de desenvolvimento):

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
npm run test:browser
```

Se Playwright e Chromium já estiverem instalados no ambiente, `PLAYWRIGHT_MODULE` pode apontar para o pacote e `BROWSER_EXECUTABLE` para o executável. O servidor de teste é iniciado automaticamente em porta livre.

A suíte verifica cinco larguras de tela, fontes e SVGs locais, ausência de requisições externas, menu, FAQ, arraste nos dois sentidos, teclado, reset, movimento reduzido, reentrada na rolagem e toque com rolagem vertical. Inclui também uma sessão sem JavaScript.
