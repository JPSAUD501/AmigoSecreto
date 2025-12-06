import type { Participant } from '@/types/participant';

export interface DrawValidation {
  isValid: boolean;
  reason?: string;
  canUseNonCircular?: boolean; // Indicates if non-circular draw is possible as fallback
}

export const validateDraw = (participants: Participant[]): DrawValidation => {
  // Check minimum participants
  if (participants.length < 3) {
    return {
      isValid: false,
      reason: 'É necessário ter pelo menos 3 participantes para o sorteio.'
    };
  }

  // Check if any participant has everyone (or more, in case of data inconsistency) blacklisted
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

  // Check for participants with very limited options (can only draw 1 person)
  for (const participant of participants) {
    const blacklist = participant.blacklist || [];
    const otherParticipants = participants.filter(p => p.id !== participant.id);
    const canDrawCount = otherParticipants.filter(p => !blacklist.includes(p.id)).length;
    
    if (canDrawCount === 1) {
      const onlyOption = otherParticipants.find(p => !blacklist.includes(p.id));
      if (onlyOption) {
        const onlyOptionBlacklist = onlyOption.blacklist || [];
        const onlyOptionCanDrawCount = otherParticipants
          .filter(p => p.id !== participant.id && !onlyOptionBlacklist.includes(p.id))
          .length;
        
        // Check if the only person they can draw also has only one option, and it's this participant
        if (onlyOptionCanDrawCount === 1 && !onlyOptionBlacklist.includes(participant.id)) {
          return {
            isValid: false,
            reason: `"${participant.name}" e "${onlyOption.name}" só podem sortear um ao outro, impossibilitando um sorteio circular com todos os participantes.`,
            canUseNonCircular: true
          };
        }
      }
    }
  }

  // Try a quick validation with a few attempts to see if draw is theoretically possible
  // Note: This is called on every participant change, but with typical group sizes (3-20 people)
  // and 100 attempts, the performance impact is minimal compared to the user experience benefit
  const quickAttempts = 100;
  const drawPossible = performDraw(participants, quickAttempts) !== null;
  
  if (!drawPossible) {
    // Try to detect isolated groups that can only draw within themselves
    const isolatedGroups = detectIsolatedGroups(participants);
    
    if (isolatedGroups.length > 0) {
      const groupNames = isolatedGroups.map(group => 
        group.map(p => `"${p.name}"`).join(', ')
      ).join(' e ');
      
      return {
        isValid: false,
        reason: `Os seguintes grupos só podem sortear entre si, impossibilitando um sorteio circular: ${groupNames}.`,
        canUseNonCircular: true
      };
    }
    
    return {
      isValid: false,
      reason: 'As restrições configuradas tornam o sorteio impossível. Por favor, revise as configurações.',
      canUseNonCircular: true // Allow non-circular as fallback
    };
  }

  return { isValid: true };
};

// Detect groups of participants that can only draw within themselves
function detectIsolatedGroups(participants: Participant[]): Participant[][] {
  const groups: Participant[][] = [];
  const visited = new Set<string>();
  
  for (const participant of participants) {
    if (visited.has(participant.id)) continue;
    
    // Find all participants this person can reach (directly or indirectly)
    const reachable = new Set<string>();
    const toVisit = [participant.id];
    
    while (toVisit.length > 0) {
      const currentId = toVisit.pop()!;
      if (reachable.has(currentId)) continue;
      reachable.add(currentId);
      
      const current = participants.find(p => p.id === currentId);
      if (!current) continue;
      
      const blacklist = current.blacklist || [];
      const canDraw = participants
        .filter(p => p.id !== currentId && !blacklist.includes(p.id))
        .map(p => p.id);
      
      for (const targetId of canDraw) {
        if (!reachable.has(targetId)) {
          toVisit.push(targetId);
        }
      }
    }
    
    // If this group is isolated (not all participants), add it
    if (reachable.size < participants.length && reachable.size > 1) {
      const groupParticipants = participants.filter(p => reachable.has(p.id));
      groups.push(groupParticipants);
      groupParticipants.forEach(p => visited.add(p.id));
    }
  }
  
  return groups;
}

// Perform a non-circular draw (not everyone gets assigned, but respects blacklists)
export const performNonCircularDraw = (participants: Participant[]): { [key: string]: string } | null => {
  const maxAttempts = 1000;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const availableGivers = new Set(participants.map(p => p.id));
    const availableReceivers = new Set(participants.map(p => p.id));
    const drawResults: { [key: string]: string } = {};
    
    // Shuffle participants to randomize assignment order
    const shuffledParticipants = [...participants];
    for (let i = shuffledParticipants.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledParticipants[i], shuffledParticipants[j]] = [shuffledParticipants[j], shuffledParticipants[i]];
    }
    
    // Try to assign each person
    for (const participant of shuffledParticipants) {
      if (!availableGivers.has(participant.id)) continue;
      
      const blacklist = participant.blacklist || [];
      const possibleReceivers = Array.from(availableReceivers).filter(
        receiverId => receiverId !== participant.id && !blacklist.includes(receiverId)
      );
      
      if (possibleReceivers.length > 0) {
        // Pick a random receiver
        const randomIndex = Math.floor(Math.random() * possibleReceivers.length);
        const selectedReceiver = possibleReceivers[randomIndex];
        
        drawResults[participant.id] = selectedReceiver;
        availableGivers.delete(participant.id);
        availableReceivers.delete(selectedReceiver);
      }
    }
    
    // Check if we managed to assign at least most participants (e.g., 80%)
    const assignedCount = Object.keys(drawResults).length;
    if (assignedCount >= Math.floor(participants.length * 0.8)) {
      return drawResults;
    }
  }
  
  return null;
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
