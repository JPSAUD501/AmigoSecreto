import type { Participant } from '@/types/participant';

export interface DrawValidation {
  isValid: boolean;
  reason?: string;
}

export const validateDraw = (participants: Participant[]): DrawValidation => {
  // Check minimum participants
  if (participants.length < 3) {
    return {
      isValid: false,
      reason: 'É necessário ter pelo menos 3 participantes para o sorteio.'
    };
  }

  // Check if any participant has everyone blacklisted
  for (const participant of participants) {
    const blacklist = participant.blacklist || [];
    const otherParticipants = participants.filter(p => p.id !== participant.id);
    
    if (blacklist.length >= otherParticipants.length) {
      return {
        isValid: false,
        reason: `"${participant.name}" não pode sortear ninguém (todas as outras pessoas estão nas restrições).`
      };
    }
  }

  // Check if any participant cannot be drawn by anyone
  for (const participant of participants) {
    const otherParticipants = participants.filter(p => p.id !== participant.id);
    const canBeDrawnByCount = otherParticipants.filter(p => {
      const blacklist = p.blacklist || [];
      return !blacklist.includes(participant.id);
    }).length;

    if (canBeDrawnByCount === 0) {
      return {
        isValid: false,
        reason: `"${participant.name}" não pode ser sorteado por ninguém (todos têm restrição com essa pessoa).`
      };
    }
  }

  // Try a quick validation with a few attempts to see if draw is theoretically possible
  const quickAttempts = 100;
  const drawPossible = performDraw(participants, quickAttempts) !== null;
  
  if (!drawPossible) {
    return {
      isValid: false,
      reason: 'As restrições configuradas tornam o sorteio impossível. Por favor, revise as configurações.'
    };
  }

  return { isValid: true };
};

export const performDraw = (participants: Participant[], maxAttempts = 1000): { [key: string]: string } | null => {
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
