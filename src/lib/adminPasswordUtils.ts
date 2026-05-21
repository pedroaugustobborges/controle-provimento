const UPPERCASE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWERCASE_CHARS = 'abcdefghijkmnopqrstuvwxyz';
const NUMBER_CHARS = '23456789';
const SYMBOL_CHARS = '!@#$%&*?';
const ALL_PASSWORD_CHARS = `${UPPERCASE_CHARS}${LOWERCASE_CHARS}${NUMBER_CHARS}${SYMBOL_CHARS}`;

function getRandomChar(charset: string) {
  const randomBuffer = new Uint32Array(1);
  crypto.getRandomValues(randomBuffer);
  return charset[randomBuffer[0] % charset.length];
}

function shuffleCharacters(characters: string[]) {
  const result = [...characters];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const randomBuffer = new Uint32Array(1);
    crypto.getRandomValues(randomBuffer);
    const swapIndex = randomBuffer[0] % (i + 1);
    [result[i], result[swapIndex]] = [result[swapIndex], result[i]];
  }

  return result;
}

export function generateTempPassword(): string {
  const requiredChars = [
    getRandomChar(UPPERCASE_CHARS),
    getRandomChar(LOWERCASE_CHARS),
    getRandomChar(NUMBER_CHARS),
    getRandomChar(SYMBOL_CHARS),
  ];

  while (requiredChars.length < 8) {
    requiredChars.push(getRandomChar(ALL_PASSWORD_CHARS));
  }

  return `Agir@${shuffleCharacters(requiredChars).join('')}`;
}

export function validateAdminPassword(password: string): string | null {
  if (!password || password.length < 8) {
    return 'A senha deve ter pelo menos 8 caracteres.';
  }

  if (!/[A-Za-z]/.test(password)) {
    return 'A senha precisa ter pelo menos uma letra.';
  }

  if (!/\d/.test(password)) {
    return 'A senha precisa ter pelo menos um número.';
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'A senha precisa ter pelo menos um símbolo.';
  }

  return null;
}

export function isWeakPasswordErrorMessage(message?: string | null): boolean {
  const normalizedMessage = (message ?? '').toLowerCase();

  return (
    normalizedMessage.includes('known to be weak') ||
    normalizedMessage.includes('easy to guess') ||
    normalizedMessage.includes('weak password') ||
    normalizedMessage.includes('authweakpassworderror')
  );
}

export function getAdminPasswordErrorMessage(message?: string | null): string {
  if (isWeakPasswordErrorMessage(message)) {
    return 'Essa senha foi bloqueada por segurança porque já apareceu em vazamentos conhecidos. Gere uma nova senha forte ou escolha outra com letra, número e símbolo.';
  }

  return message || 'Não foi possível atualizar a senha no momento.';
}