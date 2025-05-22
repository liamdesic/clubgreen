declare module 'leo-profanity' {
  export interface ProfanityFilter {
    /**
     * Add a word to the blacklist.
     */
    add: (word: string | string[]) => void;
    
    /**
     * Remove a word from the blacklist.
     */
    remove: (word: string | string[]) => void;
    
    /**
     * Reset words to a dictionary.
     */
    reset: (dictionary?: string) => void;
    
    /**
     * Clear all words in the blacklist.
     */
    clearList: () => void;
    
    /**
     * Get all words in the blacklist.
     */
    list: () => string[];
    
    /**
     * Load a dictionary of bad words.
     */
    loadDictionary: (lang?: string) => void;
    
    /**
     * Check if a string contains profanity. Returns a boolean.
     */
    check: (string: string) => boolean;
    
    /**
     * Clean the profanity from a string, replacing it with a placeholder.
     */
    clean: (string: string, placeholder?: string) => string;
    
    /**
     * Returns an array of the bad words found within the input string.
     */
    badWordsUsed: (string: string) => string[];
  }
  
  const profanity: ProfanityFilter;
  export default profanity;
}
