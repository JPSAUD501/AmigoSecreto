import type { Participant } from '@/types/participant';

export const performDraw = (participants: Participant[]): { [key: string]: string } | null => {
  const maxAttempts = 1000;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const shuffled = [...participants];
    
    // Algoritmo de Fisher-Yates para embaralhar
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Tentar criar o sorteio circular
    const drawResults: { [key: string]: string } = {};
    let valid = true;
    
    for (let i = 0; i < shuffled.length; i++) {
      const currentPerson = shuffled[i];
      const nextPerson = shuffled[(i + 1) % shuffled.length];
      
      // Verificar se a pessoa pode tirar a próxima
      const blacklist = currentPerson.blacklist || [];
      if (blacklist.includes(nextPerson.id)) {
        valid = false;
        break;
      }
      
      drawResults[currentPerson.id] = nextPerson.id;
    }
    
    if (valid) {
      return drawResults;
    }
  }
  
  return null;
};
