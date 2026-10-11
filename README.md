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

O build copia somente os arquivos públicos para `dist/`. Também é possível abrir `index.html` diretamente no navegador, sem servidor.

## Publicação sem login

Publique o conteúdo de `dist/` como site estático público em sua hospedagem. No GitHub Pages, pode-se publicar a raiz da branch `main`: Settings → Pages → Deploy from a branch → main → /(root). A configuração de Pages e a disponibilidade dependem das permissões e do plano do repositório. Nenhuma autenticação ChatGPT é implementada pela página.

Não há publicação automática configurada. A URL pública precisa ser verificada após a ativação da hospedagem. As ferramentas do conector Sites não estavam disponíveis durante a implementação.

## Identidade e conteúdo

- Fontes locais: Inter Tight (títulos) e Inter (texto), conforme o HTML/CSS da plataforma oficial. Licenças SIL OFL em `assets/`.
- Cores oficiais: `#0A0F2E`, `#181F4B`, `#7C3AED`, `#9B68F3`, `#F8FAFC`.
- Logo, favicon e imagem principal: plataforma `https://ejnbeneficios.escolajovensdenegocios.com/`.
- Categorias, informações institucionais, contato e logos de parceiros: `https://escolajovensdenegocios.com/beneficios/`.
- A LP não promete percentuais, preços ou ofertas específicas: condições e disponibilidade são consultadas na plataforma.
- WhatsApp segue o destino dos links do site original: `5517982254444`.

Edite o conteúdo em `index.html`, o visual em `styles.css` e o menu e ícones em `app.js`. Todos os recursos visuais e fontes estão no repositório: nenhuma dependência de CDN no carregamento.

## Verificação

`npm test` verifica acesso HTTP público, recursos locais, métodos HTTP e bloqueio de arquivos internos no servidor de desenvolvimento. A revisão em navegador cobre layout desktop/mobile, menu, FAQ, fontes, links e ausência de erros JavaScript.
