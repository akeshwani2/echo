import { Memory } from '@prisma/client';

// Function to check if two memories are similar using fuzzy matching
export function areSimilarMemories(memory1: string, memory2: string): boolean {
  const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const m1 = normalize(memory1);
  const m2 = normalize(memory2);
  
  // Direct match after normalization
  if (m1 === m2) return true;
  
  // Check if one is contained within the other
  if (m1.includes(m2) || m2.includes(m1)) return true;
  
  // Check for similar subject matter
  const getSubject = (text: string) => {
    const userMatch = text.match(/user(?:'s)?\s+(\w+)/i);
    return userMatch ? userMatch[1] : '';
  };
  
  const subject1 = getSubject(m1);
  const subject2 = getSubject(m2);
  
  return Boolean(subject1) && Boolean(subject2) && subject1 === subject2;
}

// Function to merge similar memories
export function mergeMemories(memories: Memory[]): Memory[] {
  const groups: { [key: string]: Memory[] } = {};
  
  // Group similar memories
  memories.forEach(memory => {
    let foundGroup = false;
    for (const key in groups) {
      if (areSimilarMemories(key, memory.text)) {
        groups[key].push(memory);
        foundGroup = true;
        break;
      }
    }
    if (!foundGroup) {
      groups[memory.text] = [memory];
    }
  });
  
  // Select the most recent memory from each group
  return Object.values(groups).map(group => 
    group.reduce((latest, current) => 
      current.timestamp > latest.timestamp ? current : latest
    )
  );
}

// Function to detect if a new memory is unique
export function isUniqueMemory(newMemory: string, existingMemories: Memory[]): boolean {
  return !existingMemories.some(existing => 
    areSimilarMemories(existing.text, newMemory)
  );
} 