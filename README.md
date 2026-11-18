# PetVitaliz Mobile — Expo + React Native

Projeto mobile organizado a partir da estrutura de referência `petvitaliz-mobile`, usando Expo, React Native e TypeScript.

## Executar no VS Code

1. Extraia o ZIP.
2. Abra a pasta `petvitaliz-mobile` no VS Code.
3. No terminal, execute:

   ```bash
   npm install
   npx expo start
   ```

4. Leia o QR code com o Expo Go ou pressione `w` para abrir no navegador.

## Telas incluídas

- Login, cadastro, recuperação de senha, e-mail enviado e nova senha.
- Início, explorar, serviços, benefícios e dicas para pets.
- Perfil, dados pessoais, formas de pagamento, segurança e dispositivos conectados.
- Meus pets, cadastro de pet em quatro etapas, perfil/saúde/histórico do pet.
- Agendamento em cinco etapas, confirmação, consultas, detalhes e histórico.
- Central de notificações com notificações recentes, estado vazio e preferências de avisos.
- Planos mensal/anual, contratação, pagamento, confirmação, gerenciamento e faturas.
- Ajuda, FAQ, termos, privacidade e exclusão de conta/pet.

## Imagens

Onde os layouts de referência usam fotografias ou ilustrações, foi colocado `●` como marcador preto para você substituir pela imagem exportada correspondente.

## API

O app usa a API PetVitaliz em Spring Boot (`src/services`). Login, cadastro, recuperação de senha, pets, consultas e planos são gravados no servidor.

- Em desenvolvimento o endereço é descoberto sozinho: o app usa o mesmo IP do computador que roda o `npx expo start`, na porta 3000. Deixe a API rodando nesse computador e o celular na mesma rede Wi-Fi.
- O arquivo `.env` define `EXPO_PUBLIC_API_URL`. Com ele preenchido, o app usa a API publicada na Render (`https://petvitaliz-service-spring.onrender.com`). Apague a linha para voltar a usar a API local. Depois de mudar, reinicie o Expo com `npx expo start -c`.
- Builds de produção usam a API da Render mesmo sem o `.env`.
- A sessão fica só na memória: ao fechar o app é preciso entrar de novo.
- A API guarda um plano por conta. No app ele aparece vinculado ao pet escolhido na contratação.
- Dados pessoais, cartões e notificações continuam locais, porque a API não tem rotas para eles.
