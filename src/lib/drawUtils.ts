import type { Participant } from '@/types/participant';

export interface DrawValidation {
  isValid: boolean;
  reason?: string;
  canUseNonCircular?: boolean; // Indicates if non-circular draw is possible as fallback
}

// Extract cycles from draw results
export const extractCycles = (drawResults: { [key: string]: string }, participantIds: string[]): string[][] => {
  const visited = new Set<string>();
  const cycles: string[][] = [];
  
  for (const startId of participantIds) {
    if (visited.has(startId)) continue;
    
    const cycle: string[] = [];
    let currentId = startId;
    
    while (!visited.has(currentId)) {
      visited.add(currentId);
      cycle.push(currentId);
      currentId = drawResults[currentId];
      
      if (!currentId) break; // Safety check
    }
    
    if (cycle.length > 0) {
      cycles.push(cycle);
    }
  }
  
  return cycles;
};

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
    // Try non-circular draw to see if everyone can participate
    const nonCircularPossible = performNonCircularDraw(participants) !== null;
    
    if (nonCircularPossible) {
      // Everyone can participate, but not in a single cycle
      // Try to detect isolated groups for better error message
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
        reason: 'Não é possível realizar um sorteio circular com as restrições atuais, mas é possível fazer um sorteio com múltiplos círculos.',
        canUseNonCircular: true
      };
    }
    
    // Not even non-circular is possible - someone cannot participate
    return {
      isValid: false,
      reason: 'As restrições configuradas tornam impossível que todos participem do sorteio. Por favor, revise as configurações.',
      canUseNonCircular: false
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

// Perform a multi-cycle draw where everyone participates in the minimum number of cycles
export const performNonCircularDraw = (participants: Participant[]): { [key: string]: string } | null => {
  const maxAttempts = 1000;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const drawResults: { [key: string]: string } = {};
    const assigned = new Set<string>();
    const remaining = new Set(participants.map(p => p.id));
    
    // Try to create cycles until everyone is assigned
    while (remaining.size > 0) {
      // Pick a random starting participant from remaining
      const remainingArray = Array.from(remaining);
      const startId = remainingArray[Math.floor(Math.random() * remainingArray.length)];
      
      // Try to build a cycle starting from this participant
      const cycle = buildCycle(participants, startId, remaining);
      
      if (!cycle || cycle.length < 2) {
        // Cannot build a cycle with remaining participants
        break;
      }
      
      // Add this cycle to results
      for (let i = 0; i < cycle.length; i++) {
        const currentId = cycle[i];
        const nextId = cycle[(i + 1) % cycle.length];
        drawResults[currentId] = nextId;
        assigned.add(currentId);
        remaining.delete(currentId);
      }
    }
    
    // Check if everyone was assigned
    if (assigned.size === participants.length) {
      return drawResults;
    }
  }
  
  return null;
};

// Helper function to build a cycle starting from a given participant
function buildCycle(
  participants: Participant[],
  startId: string,
  availableIds: Set<string>
): string[] | null {
  const maxCycleAttempts = 100;
  
  for (let attempt = 0; attempt < maxCycleAttempts; attempt++) {
    const cycle: string[] = [startId];
    const usedInCycle = new Set<string>([startId]);
    let currentId = startId;
    
    // Try to build a cycle
    while (true) {
      const current = participants.find(p => p.id === currentId);
      if (!current) break;
      
      const blacklist = current.blacklist || [];
      
      // Find possible next participants (excluding those already in cycle)
      const possibleNext = Array.from(availableIds).filter(id => 
        !usedInCycle.has(id) && !blacklist.includes(id)
      );
      
      // Check if we can close the cycle back to start
      const canCloseToStart = !blacklist.includes(startId);
      
      // If no possible next participants
      if (possibleNext.length === 0) {
        // Try to close the cycle if we can and have at least 2 people
        if (canCloseToStart && cycle.length >= 2) {
          return cycle;
        }
        // Dead end, try again with a new attempt
        break;
      }
      
      // Decide whether to close the cycle or continue
      if (canCloseToStart && cycle.length >= 2) {
        // For small cycles (2-3 people), close more readily
        // For larger cycles, be more likely to close as it grows
        const closeChance = cycle.length === 2 ? 0.5 : Math.min(0.2 + (cycle.length * 0.15), 0.85);
        if (Math.random() < closeChance) {
          return cycle;
        }
      }
      
      // Pick next participant
      const nextId = possibleNext[Math.floor(Math.random() * possibleNext.length)];
      cycle.push(nextId);
      usedInCycle.add(nextId);
      currentId = nextId;
      
      // Safety check - if cycle includes all available, must close
      if (cycle.length >= availableIds.size) {
        if (canCloseToStart) {
          return cycle;
        }
        // Can't close, this attempt failed
        break;
      }
    }
  }
  
  return null;
}

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
