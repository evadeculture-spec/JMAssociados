# Elementos que exigem confirmação da sociedade

1. **Dados de contacto**: telefone 272 328 566, e-mail jma@jma-advogados.com (domínio .com, diferente do domínio do site .com.pt), morada Avenida 1º Maio 12, 2º, 6000-086 Castelo Branco. Manter a nota «custo chamada para a rede fixa nacional».
2. **Logótipo**: variantes digitais com fundo transparente criadas a partir do logótipo oficial fornecido (IMG_1077.jpeg), sem redesenho (`scripts/prepare-logo.py`):
   - `src/assets/brand/jma-official-transparent.png` — cores oficiais (cabeçalho, fundos claros);
   - `src/assets/brand/jma-official-inverse.png` — denominação a branco e inscrição a marfim, para fotografia e fundo escuro (abertura, rodapé); o símbolo é idêntico.
   **Limitação:** as letras J, M e «&a» são branco da página visto através do bloco bordô e, na base do bloco, fundem-se com o fundo. A versão transparente mantém o retângulo do bloco opaco (bordô + letras brancas), pelo que a base das letras termina na aresta inferior do bloco e o gancho do J fica fechado a branco no canto inferior esquerdo. É a leitura possível a partir de um JPEG sem redesenhar letras. Para uma reprodução exata é necessário o ficheiro vetorial oficial (SVG, PDF ou AI) com as letras como formas próprias.
3. **Cor**: bordô retirado do logótipo oficial (#7B160E) como cor de destaque; preto editorial #211D1D, marfim #F8F6F2, cinzento quente.
4. **Áreas de atuação**: agrupamento, separação de «Direito Penal e Civil», novas formas «Direito da Família e Menores» e «Direito Contraordenacional», e grupo de «Partilhas» (ver `docs/mapa-areas.md`).
5. **Direito Administrativo**: frases descritivas dos seis domínios (a fonte só publica os nomes).
6. **Sociedade**: perfis individuais (nomes, funções, fotografias, biografias). Decidir se se mantém a frase «profissionais experientes».
7. **Indicações de acesso e horário**: horário de atendimento, estacionamento, acessibilidade, elevador.
8. **Formulário de contacto**: escolher o canal de receção (e-mail transacional ou outro serviço) e o endereço de destino. Até lá, o formulário fica desativado e a página mostra telefone e e-mail.
9. **Políticas de privacidade e de cookies**: textos revistos para esta implementação (sem cookies, sem análise de tráfego, sem newsletter). Falta o prazo de conservação dos dados e a identificação dos prestadores (alojamento e envio).
10. **Fotografias**: fundos permanentes com as fotografias reais indicadas pelo cliente (sala de reuniões, biblioteca e recorte alternativo da biblioteca). Os ficheiros enviados (IMG_1069, IMG_1070, IMG_1078) são capturas do site atual com a sobreposição amarela do Wix gravada; foram usados os originais das mesmas fotografias, sem sobreposição e em maior resolução, com correção suave de cor (`scripts/prepare-photos.py`); o recorte IMG_1078 foi reproduzido a partir do original. A fotografia das letras «JM&a» deixou de ser usada por não constar da lista fornecida. Confirmar a autorização de uso.
11. **Facebook**: a ligação para a página de Facebook do site atual não foi incluída. Indicar se deve constar.
12. **Alojamento e domínio**: a publicação em www.jma-advogados.com.pt depende de aprovação e da transferência do DNS a partir do Wix.
13. **Ações da abertura**: «Conhecer a sociedade» e «Áreas de atuação», como pedido. «Pedir consulta» está no bloco Contactos e na página Contactos; no telemóvel, o cabeçalho tem um botão «Ligar».
